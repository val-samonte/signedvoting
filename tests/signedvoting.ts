import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Signedvoting } from "../target/types/signedvoting";
import { expect } from "chai";

describe("signedvoting", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.signedvoting as Program<Signedvoting>;
  const provider = anchor.getProvider();

  // Test accounts
  let author: anchor.web3.Keypair;
  let voter: anchor.web3.Keypair;
  let proposalPda: anchor.web3.PublicKey;
  let votePda: anchor.web3.PublicKey;
  let proposalBump: number;
  let voteBump: number;

  // Test data
  const testUri = "https://example.com/proposal";
  const testHash = new Uint8Array(32).fill(1); // Simple test hash
  const voteChoice = 1; // Yes vote

  before(async () => {
    // Generate keypairs for testing
    author = anchor.web3.Keypair.generate();
    voter = anchor.web3.Keypair.generate();

    // Airdrop SOL only to author (proposal creator)
    await provider.connection.requestAirdrop(author.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    // Note: voter has 0 SOL balance - they shouldn't need any SOL to vote

    // Wait for airdrop to confirm
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find proposal PDA
    [proposalPda, proposalBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [author.publicKey.toBuffer(), testHash],
      program.programId
    );

    // Find vote PDA
    [votePda, voteBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [proposalPda.toBuffer(), voter.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Creates a proposal successfully", async () => {
    const tx = await program.methods
      .createProposal(testUri, Array.from(testHash))
      .accounts({
        author: author.publicKey,
        payer: author.publicKey,
      })
      .signers([author])
      .rpc();

    console.log("Create proposal transaction signature:", tx);

    // Verify the proposal was created
    const proposalAccount = await program.account.proposal.fetch(proposalPda);
    
    expect(proposalAccount.author.toString()).to.equal(author.publicKey.toString());
    expect(proposalAccount.payer.toString()).to.equal(author.publicKey.toString());
    expect(proposalAccount.uri).to.equal(testUri);
    expect(Array.from(proposalAccount.hash)).to.deep.equal(Array.from(testHash));
    expect(proposalAccount.bump).to.equal(proposalBump);
  });

  it("Votes on the proposal successfully", async () => {
    const tx = await program.methods
      .vote(voteChoice)
      .accounts({
        proposal: proposalPda,
        voter: voter.publicKey,
        payer: author.publicKey, // Must be the same as proposal payer
      })
      .signers([voter, author])
      .rpc();

    console.log("Vote transaction signature:", tx);

    // Verify the vote was created
    const voteAccount = await program.account.vote.fetch(votePda);
    
    expect(voteAccount.voter.toString()).to.equal(voter.publicKey.toString());
    expect(voteAccount.proposalId.toString()).to.equal(proposalPda.toString());
    expect(voteAccount.choice).to.equal(voteChoice);
    expect(voteAccount.bump).to.equal(voteBump);
  });

  it("Fails to vote with wrong payer", async () => {
    const wrongPayer = anchor.web3.Keypair.generate();
    const differentVoter = anchor.web3.Keypair.generate();
    await provider.connection.requestAirdrop(wrongPayer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    // Note: differentVoter has 0 SOL balance - they shouldn't need any SOL to vote
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find vote PDA for the different voter
    const [differentVotePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [proposalPda.toBuffer(), differentVoter.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .vote(voteChoice)
        .accounts({
          proposal: proposalPda,
          voter: differentVoter.publicKey,
          payer: wrongPayer.publicKey, // Wrong payer
        })
        .signers([differentVoter, wrongPayer])
        .rpc();
      
      expect.fail("Expected transaction to fail with wrong payer");
    } catch (error) {
      expect(error.message).to.include("InvalidPayer");
    }
  });
});
