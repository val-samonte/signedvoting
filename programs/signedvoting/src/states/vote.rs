use anchor_lang::prelude::*;

#[account]
pub struct Vote {
    pub bump: u8,          // 1 byte
    pub voter: Pubkey,     // 32 bytes
    pub proposal_id: Pubkey, // 32 bytes
    pub choice: u8,        // 1 byte
}
