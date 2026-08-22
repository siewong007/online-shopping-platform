use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct AdminMfaEnrollmentConfirmInput {
    pub code: String,
}

#[derive(Debug, Serialize)]
pub struct AdminMfaEnrollmentStart {
    pub otpauth_url: String,
    /// Base32-encoded secret, shown as a fallback for authenticator apps that cannot scan QR.
    pub secret_base32: String,
}

#[derive(Debug, Serialize)]
pub struct AdminMfaRecoveryCodes {
    /// Shown exactly once at enrollment; the server stores only hashes.
    pub recovery_codes: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct AdminMfaDisableInput {
    pub password: String,
    pub code: String,
}

#[derive(Debug, Deserialize)]
pub struct AdminMfaLoginVerifyInput {
    pub challenge_token: String,
    pub code: Option<String>,
    pub recovery_code: Option<String>,
}
