package repositories

import (
	"context"
	"fmt"
	"matchmaking-service/internal/models"
	"strconv"

	"github.com/redis/go-redis/v9"
)

type QueueRepo struct {
	rdb *redis.Client
}

func NewQueueRepo(rdb *redis.Client) *QueueRepo { return &QueueRepo{rdb: rdb} }

func (q *QueueRepo) Add(ctx context.Context, item models.QueueItem) error {
	key := fmt.Sprintf("arena:%d:%d", item.Arena, item.Trophies/100*100)
	score := float64(item.Trophies)
	member := fmt.Sprintf("%d.%s", item.PlayerID, item.RequestID)
	//member := strconv.FormatUint(uint64(item.PlayerID), 10) + "." + item.RequestID
	return q.rdb.ZAdd(ctx, key, redis.Z{Score: score, Member: member}).Err()
}

func (q *QueueRepo) PopPair(ctx context.Context, arena, bucket int, delta int) ([]string, error) {
	key := fmt.Sprintf("arena:%d:%d", arena, bucket)
	min := float64(bucket - delta)
	max := float64(bucket + delta)
	list, err := q.rdb.ZRangeByScoreWithScores(ctx, key, &redis.ZRangeBy{
		Min: strconv.Itoa(int(min)), Max: strconv.Itoa(int(max)), Count: 2,
	}).Result()
	if err != nil || len(list) < 2 {
		return nil, err
	}
	p1 := list[0].Member.(string)
	p2 := list[1].Member.(string)
	removed, err := q.rdb.ZRem(ctx, key, p1, p2).Result()
	if err != nil || removed != 2 {
		return nil, err
	}
	return []string{p1, p2}, nil
}