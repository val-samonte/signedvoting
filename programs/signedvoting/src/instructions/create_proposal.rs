use anchor_lang::prelude::*;
use crate::states::*;

#[derive(Accounts)]
#[instruction(uri: String, hash: [u8; 32])]
pub struct CreateProposal<'info> {
    #[account(
        init,
        payer = author,
        space = 8 + 1 + 32 + 32 + 4 + uri.len() + 32,
        seeds = [author.key().as_ref(), hash.as_ref()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    
    #[account(mut)]
    pub author: Signer<'info>,
    
    /// CHECK: Payer account is validated by the system program during account creation
    #[account(mut)]
    pub payer: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_proposal_handler(ctx: Context<CreateProposal>, uri: String, hash: [u8; 32]) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    proposal.author = ctx.accounts.author.key();
    proposal.payer = ctx.accounts.payer.key();
    proposal.uri = uri;
    proposal.hash = hash;
    proposal.bump = ctx.bumps.proposal;
    
    Ok(())
}