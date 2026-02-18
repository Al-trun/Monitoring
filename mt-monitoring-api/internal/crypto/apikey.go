package crypto

import (
	"crypto/rand"
	"encoding/hex"
)

// GenerateApiKey generates a cryptographically secure API key.
// Format: mt_ + 64 hex chars (256 bits of entropy)
func GenerateApiKey() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		// rand.Read should never fail on any supported OS
		panic("crypto/rand unavailable: " + err.Error())
	}
	return "mt_" + hex.EncodeToString(b)
}
