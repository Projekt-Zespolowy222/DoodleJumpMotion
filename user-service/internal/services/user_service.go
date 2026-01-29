package services

import (
	"doodlejump-backend/user-service/internal/domain"
	"doodlejump-backend/user-service/internal/repository"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte("supersecretkey")

type UserService struct {
	repo *repository.UserRepository
}

func NewUserService(repo *repository.UserRepository) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) RegisterUser(username, email, password, role string) (*domain.User, error) {
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	if role != "admin" {
        role = "player"
    }

	user := &domain.User{
        Username:     username,
        Email:        email,
        PasswordHash: string(hashedPassword),
        Role:         role,
        CupCount:     0,
        Level:        1,
    }

	if err := s.repo.CreateUser(user); err != nil {
		return nil, err
	}
	return user, nil
}

func CheckPasswordHash(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}

func GenerateJWT(userID int64, username, role string, cupCount int) (string, error) {
    claims := jwt.MapClaims{
        "user_id":  userID,
        "username": username,
		"role":     role,
		"cup_count": cupCount,
        "exp":      time.Now().Add(time.Hour * 72).Unix(),
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(jwtSecret)
}

func (s *UserService) GetByEmail(email string) (*domain.User, error) {
    return s.repo.GetByEmail(email)
}
func (s *UserService) GetByID(id int64) (*domain.User, error) {
    return s.repo.GetByID(id)
}

func (s *UserService) UpdateUser(u *domain.User) error {
    return s.repo.UpdateUser(u)
}

func (s *UserService) GetAllUsersInfo() ([]repository.UserShort, error) {
	return s.repo.GetAllUsersInfo()
}

//genetate custom jwt with role admin without exp

func GenerateAdminJWT(userID int64, username string) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  userID,
		"username": username,
		"role":     "admin",
		"cup_count": 9999,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}