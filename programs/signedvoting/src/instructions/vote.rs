use anchor_lang::prelude::*;
use crate::states::*;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct VoteInstruction<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 1 + 32 + 32 + 1,
        seeds = [proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote: Account<'info, Vote>,
    
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    
    #[account(mut)]
    pub voter: Signer<'info>,
    
    #[account(
        mut,
        constraint = payer.key() == proposal.payer @ ErrorCode::InvalidPayer
    )]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn vote(ctx: Context<VoteInstruction>, choice: u8) -> Result<()> {
    let vote = &mut ctx.accounts.vote;
    vote.voter = ctx.accounts.voter.key();
    vote.proposal_id = ctx.accounts.proposal.key();
    vote.choice = choice;
    vote.bump = ctx.bumps.vote;
    
    Ok(())
}