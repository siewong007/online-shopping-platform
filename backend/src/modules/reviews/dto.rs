use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct CreateReviewInput {
    pub rating: i16,
    pub body: String,
}
