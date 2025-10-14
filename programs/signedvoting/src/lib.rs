use anchor_lang::prelude::*;

// Import modules
pub mod states;
pub mod instructions;
pub mod errors;

pub use instructions::*;

declare_id!("8Z52ChpaMPvvnSVjSrQmJirxiqpuNvQSprUebVWXyaCs");

#[program]
pub mod signedvoting {
    use super::*;

    pub fn create_proposal(ctx: Context<CreateProposal>, uri: String, hash: [u8; 32]) -> Result<()> {
        create_proposal_handler(ctx, uri, hash)
    }

    pub fn vote(ctx: Context<VoteInstruction>, choice: u8) -> Result<()> {
        vote_handler(ctx, choice)
    }
}
