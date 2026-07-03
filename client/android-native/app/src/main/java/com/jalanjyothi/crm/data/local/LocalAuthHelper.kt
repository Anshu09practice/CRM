package com.jalanjyothi.crm.data.local

import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

/**
 * Local PBKDF2 password hashing compatible with the Capacitor app.
 * Format: "pbkdf2:<iterations>:<saltHex>:<hashHex>"
 */
object LocalAuthHelper {
    private const val ITERATIONS = 310_000
    private const val KEY_LENGTH = 256
    private const val ALGORITHM = "PBKDF2WithHmacSHA256"

    fun hashPassword(password: String): String {
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val spec = PBEKeySpec(password.toCharArray(), salt, ITERATIONS, KEY_LENGTH)
        val hash = SecretKeyFactory.getInstance(ALGORITHM).generateSecret(spec).encoded
        spec.clearPassword()
        return "pbkdf2:$ITERATIONS:${salt.toHex()}:${hash.toHex()}"
    }

    fun verifyPassword(password: String, storedHash: String): Boolean {
        if (!storedHash.startsWith("pbkdf2:")) return false
        val parts = storedHash.split(":")
        if (parts.size != 4) return false
        val iterations = parts[1].toIntOrNull() ?: return false
        val salt = parts[2].hexToByteArray()
        val expectedHash = parts[3]
        val spec = PBEKeySpec(password.toCharArray(), salt, iterations, KEY_LENGTH)
        val hash = SecretKeyFactory.getInstance(ALGORITHM).generateSecret(spec).encoded
        spec.clearPassword()
        return hash.toHex() == expectedHash
    }

    private fun ByteArray.toHex() = joinToString("") { "%02x".format(it) }
    private fun String.hexToByteArray() = chunked(2).map { it.toInt(16).toByte() }.toByteArray()
}
