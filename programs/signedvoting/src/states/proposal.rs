use anchor_lang::prelude::*;

#[account]
pub struct Proposal {
    pub bump: u8,          // 1 byte
    pub author: Pubkey,    // 32 bytes
    pub payer: Pubkey,     // 32 bytes
    pub uri: String,       // 4 + variable length
    pub hash: [u8; 32],    // 32 bytes
}
