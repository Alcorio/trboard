package service

import (
	"database/sql"
	"trboard/model"
)

type UserRepository struct {
	DB *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{DB: db}
}

func (repo *UserRepository) FindByUsername(username string) (*model.User, error) {
	var user model.User
	query := "SELECT id, username, password FROM users WHERE username = $1"
	err := repo.DB.QueryRow(query, username).Scan(&user.ID, &user.Username, &user.Password)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// func (repo *UserRepository) InsertUpload()
