package service

import (
	"errors"
	"trboard/model"
	// "trboard/service"
)

type AuthService struct {
	UserRepo *UserRepository
}

func NewAuthService(userRepo *UserRepository) *AuthService {
	return &AuthService{UserRepo: userRepo}
}

func (service *AuthService) Login(username, password string) (*model.User, error) {
	user, err := service.UserRepo.FindByUsername(username)
	if err != nil || user.Password != password {
		return nil, errors.New("invalid username or password")
	}
	return user, nil
}
