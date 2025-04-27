package utils

import (
	"errors"
	"time"

	"github.com/dgrijalva/jwt-go"
)

var jwtSecret = []byte("my_secret_key")

type Claims struct {
	Username string `json:"username"`
	Userid   string `json:"userid"`
	jwt.StandardClaims
}

func GenerateToken(username string, userid string) (string, error) {
	claims := Claims{
		Username: username,
		Userid:   userid,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(2 * time.Hour).Unix(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func ValidateToken(tokenString string) (string, string, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return "", "", errors.New("invalid token")
	}
	return claims.Username, claims.Userid, nil
}
