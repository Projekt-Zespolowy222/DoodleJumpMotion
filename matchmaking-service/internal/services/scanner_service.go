package services

import (
	"context"
	"log"
	"matchmaking-service/internal/dto"
	"matchmaking-service/internal/utils"
	"strconv"
	"time"
)

type ScannerService struct {
	qs    *QueueService
	natsP *NatsPublisher
}

func NewScannerService(qs *QueueService, natsP *NatsPublisher) *ScannerService {
	return &ScannerService{qs: qs, natsP: natsP}
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
						ev := dto.MatchFoundEvent{
							Player1ID: strconv.FormatUint(uint64(p1ID), 10),
							Player2ID: strconv.FormatUint(uint64(p2ID), 10),
							Arena:     arena,
						}
						if err := s.natsP.PublishMatchFound(ev); err == nil {
							log.Printf("matched p%d vs p%d in arena %d", p1ID, p2ID, arena)
						}
					}
				}
			}
		}
	}
}