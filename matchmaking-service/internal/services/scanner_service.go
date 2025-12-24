package services

import (
	"context"
	"log"
	"matchmaking-service/internal/clients"
	"matchmaking-service/internal/dto"
	"matchmaking-service/internal/utils"
	"strconv"
	"time"
)

type ScannerService struct {
	qs    *QueueService
	natsP *NatsPublisher
	sessCli *clients.SessionClient
}

type StatusHandler struct {
	qs *QueueService
}

func NewScannerService(qs *QueueService, natsP *NatsPublisher, sessCli *clients.SessionClient) *ScannerService {
	return &ScannerService{qs: qs, natsP: natsP, sessCli: sessCli}
}

func (s *ScannerService) Start(ctx context.Context) {
	tick := time.NewTicker(50 * time.Millisecond)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			for arena := 1; arena <= 10; arena++ {
				for bucket := 0; bucket <= 8000; bucket += 100 {
					pair, err := s.qs.DequeuePair(ctx, arena, bucket, 100)
					if err == nil && len(pair) == 2 {
						p1ID := utils.ParsePlayerID(pair[0])
						p2ID := utils.ParsePlayerID(pair[1])
						if p1ID == p2ID {
							log.Printf("[SKIP] same player ID: %d", p1ID)
							continue
						}
						ev := dto.MatchFoundEvent{
							Player1ID: strconv.FormatUint(uint64(p1ID), 10),
							Player2ID: strconv.FormatUint(uint64(p2ID), 10),
							Arena:     arena,
						}
						if err := s.natsP.PublishMatchFound(ev); err == nil {
							log.Printf("matched p%d vs p%d in arena %d", p1ID, p2ID, arena)

							sessID, seed, err := s.sessCli.CreateSession(ctx, p1ID, p2ID)
							log.Printf("[TEST SESSION PARAM] sessID: %d, seed: %d for p1ID=%d and p2ID=%d", sessID, seed, p1ID, p2ID)
							if err != nil {
								log.Printf("session create failed: %v", err)
								continue
							}

							log.Printf("SetSession %s %d %d", pair[0], sessID, seed)
							log.Printf("SetSession %s %d %d", pair[1], sessID, seed)
							reqID1 := utils.ParseRequestID(pair[0])
							reqID2 := utils.ParseRequestID(pair[1])
							
							log.Printf("[DEBUG] Before SetSession: looking for requestID=%s", reqID1)
							s.qs.SetSession(reqID1, sessID, seed) 
							
							log.Printf("[DEBUG] Before SetSession: looking for requestID=%s", reqID2)
							s.qs.SetSession(reqID2, sessID, seed)
							log.Printf("[DEBUG] After SetSession: both called")
						}
					}
				}
			}
		}
	}
}