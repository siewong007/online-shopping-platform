use std::fmt::Write;
use std::sync::OnceLock;

use anyhow::{Result, anyhow, bail};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier, password_hash::SaltString};
use rand::{RngCore, rngs::OsRng};

pub fn hash_password(password: &str) -> Result<String> {
    if password.trim().is_empty() {
        bail!("Password cannot be empty.");
    }

    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|error| anyhow!("failed to hash password: {error}"))?
        .to_string();

    Ok(password_hash)
}

pub fn verify_password(password: &str, password_hash: &str) -> bool {
    let Ok(parsed_hash) = PasswordHash::new(password_hash) else {
        return false;
    };

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

/// A precomputed hash with no matching password, used to keep `verify_password_or_dummy`'s
/// runtime constant whether or not the account exists — otherwise a missing-account lookup
/// returns before the (comparatively expensive) Argon2 verify, letting an attacker time their
/// way into enumerating valid emails.
fn dummy_password_hash() -> &'static str {
    static HASH: OnceLock<String> = OnceLock::new();
    HASH.get_or_init(|| {
        hash_password("timing-attack-mitigation-dummy-password")
            .expect("hashing a fixed dummy password should never fail")
    })
}

/// Always runs an Argon2 verify, even when `password_hash` is `None`, so login can't be used
/// to distinguish "no such account" from "wrong password" by response latency.
pub fn verify_password_or_dummy(password: &str, password_hash: Option<&str>) -> bool {
    match password_hash {
        Some(hash) => verify_password(password, hash),
        None => {
            verify_password(password, dummy_password_hash());
            false
        }
    }
}

pub fn generate_session_token() -> String {
    let mut bytes = [0_u8; 32];
    OsRng.fill_bytes(&mut bytes);

    let mut token = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        let _ = write!(&mut token, "{byte:02x}");
    }

    token
}
