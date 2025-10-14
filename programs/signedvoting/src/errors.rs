use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid payer - must be the proposal's original payer")]
    InvalidPayer,
}
