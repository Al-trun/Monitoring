package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"sync"
)

var (
	masterKey []byte
	once      sync.Once
	initErr   error
)

// Init loads the master encryption key from config or environment.
// The key must be a 32-byte hex string (64 hex chars) for AES-256.
// If no key is configured, encryption is disabled and plaintext is stored.
func Init(configKey string) error {
	once.Do(func() {
		keyHex := configKey
		if envKey := os.Getenv("MT_SECURITY_ENCRYPTIONKEY"); envKey != "" {
			keyHex = envKey
		}

		if keyHex == "" {
			// No key configured — encryption disabled
			return
		}

		key, err := hex.DecodeString(keyHex)
		if err != nil {
			initErr = fmt.Errorf("invalid encryption key (must be hex): %w", err)
			return
		}
		if len(key) != 32 {
			initErr = fmt.Errorf("encryption key must be 32 bytes (64 hex chars), got %d bytes", len(key))
			return
		}
		masterKey = key
	})
	return initErr
}

// IsEnabled returns true if encryption is configured.
func IsEnabled() bool {
	return masterKey != nil
}

// Encrypt encrypts plaintext using AES-256-GCM.
// Returns hex-encoded ciphertext. If encryption is disabled, returns plaintext as-is.
func Encrypt(plaintext string) (string, error) {
	if !IsEnabled() || plaintext == "" {
		return plaintext, nil
	}

	block, err := aes.NewCipher(masterKey)
	if err != nil {
		return "", fmt.Errorf("cipher creation failed: %w", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("GCM creation failed: %w", err)
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("nonce generation failed: %w", err)
	}

	ciphertext := aesGCM.Seal(nonce, nonce, []byte(plaintext), nil)
	return hex.EncodeToString(ciphertext), nil
}

// Decrypt decrypts hex-encoded AES-256-GCM ciphertext.
// If encryption is disabled, returns the input as-is.
func Decrypt(ciphertextHex string) (string, error) {
	if !IsEnabled() || ciphertextHex == "" {
		return ciphertextHex, nil
	}

	ciphertext, err := hex.DecodeString(ciphertextHex)
	if err != nil {
		// Not encrypted — return as-is (backward compat with pre-encryption data)
		return ciphertextHex, nil
	}

	block, err := aes.NewCipher(masterKey)
	if err != nil {
		return "", fmt.Errorf("cipher creation failed: %w", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("GCM creation failed: %w", err)
	}

	nonceSize := aesGCM.NonceSize()
	if len(ciphertext) < nonceSize {
		// Too short to be encrypted — return as-is
		return ciphertextHex, nil
	}

	nonce, ciphertextBytes := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := aesGCM.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		// Decryption failed — might be plaintext from before encryption was enabled
		return ciphertextHex, errors.New("decryption failed, data may not be encrypted")
	}

	return string(plaintext), nil
}
