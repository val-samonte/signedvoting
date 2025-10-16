# SignedVoting

A **Web2.5** proof-of-concept voting system that enables wallet-less voting on Solana while maintaining privacy and cryptographic integrity.

<img width="1917" height="879" alt="image" src="https://github.com/user-attachments/assets/6a005a9a-c2bc-4e46-8772-711a32d90aec" />

## 🎯 Overview

This project demonstrates how people can participate in blockchain-based voting without requiring Web3 wallet onboarding. Users draw their signature to generate a unique keypair, which is then used to cast votes. The system maintains privacy while ensuring vote integrity through cryptographic signatures.

### Key Innovation

- **Wallet-less Voting**: Voters don't need their own Solana wallet
- **Signature-based Authentication**: Users draw signatures to generate unique keypairs
- **Privacy Preservation**: Admins cannot see individual votes
- **Tamper-proof Proposals**: All proposals are cryptographically secured on-chain

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 15.5.5 with React 19
- TypeScript
- Tailwind CSS
- Perfect Freehand (signature drawing)

**Backend:**
- Solana Program (Anchor framework)
- Prisma ORM with SQLite
- Next.js API routes

**Blockchain:**
- Solana (localnet/devnet/mainnet support)
- Anchor framework for program development
- Borsh serialization

### System Components

1. **Signature Generation**: Users draw signatures using Perfect Freehand
2. **Keypair Derivation**: Signatures are converted to Solana keypairs
3. **Vote Casting**: Votes are signed and submitted to the blockchain
4. **Privacy Layer**: Only signature hashes are stored in the database
5. **Proposal Management**: On-chain proposal storage with off-chain metadata

## 🚀 Features

### ✅ Implemented

- **Wallet-less Voting**: No wallet required for voters
- **Signature-based Authentication**: Draw-to-vote mechanism
- **Privacy Protection**: Admins cannot see individual votes
- **Proposal Creation**: Create and manage voting proposals
- **Vote Verification**: Cryptographic proof of voting
- **User Management**: Registration and authentication system
- **Responsive UI**: Modern, mobile-friendly interface

### 🔄 In Development / Missing

- **Proposal Duration/Expiry**: Time-based proposal lifecycle
- **Vote Reclaiming**: Mechanism to reclaim unused vote accounts
- **Separate Vote Counter**: Dedicated account for vote tallying
- **Advanced Security**: Additional cryptographic protections
- **Audit Trail**: Enhanced logging and transparency features

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+ 
- Rust 1.70+
- Solana CLI tools
- Anchor framework

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd signedvoting
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install app dependencies
   cd app
   npm install
   ```

3. **Setup Solana environment**
   ```bash
   # Configure Solana CLI
   solana config set --url localhost
   
   # Create keypair (if needed)
   solana-keygen new --outfile ~/.config/solana/id.json
   ```

4. **Setup database**
   ```bash
   cd app
   npx prisma generate
   npx prisma db push
   ```

5. **Build and deploy the program**
   ```bash
   # Build the Solana program
   anchor build
   
   # Deploy to localnet
   anchor deploy
   ```

6. **Start the development server**
   ```bash
   cd app
   npm run dev
   ```

## 📖 Usage

### For Voters

1. **Register**: Create an account with username/password
2. **Browse Proposals**: View available voting proposals
3. **Draw Signature**: Use the signature pad to create your unique signature
4. **Cast Vote**: Select your choice and submit your signed vote
5. **Download Proof**: Save your signature as proof of voting

### For Administrators

1. **Create Proposals**: Define voting options and descriptions
2. **Manage Vote Accounts**: Fund and maintain voting accounts
3. **Monitor Results**: View aggregated voting results
4. **Verify Integrity**: Ensure proposal and vote integrity

## 🔒 Security Considerations

### Privacy Protection
- Individual votes are not visible to administrators
- Only signature hashes are stored in the database
- Vote choices are encrypted and stored on-chain

### Cryptographic Integrity
- All proposals are hashed and stored on-chain
- Votes are cryptographically signed
- Signature-based keypair generation ensures uniqueness

### Limitations
- This is a proof-of-concept implementation
- Not audited for production use
- Centralized database for user management
- Vote accounts managed by trusted parties

## ⚠️ Disclaimer

This is a **proof-of-concept** implementation created for educational and experimental purposes. The author is not a cryptography expert, and this implementation may contain security vulnerabilities. **Do not use in production** without proper security auditing and additional development.

Vibe coded in 2 days using Cursor.

## 🤝 Contributing

This project was developed as a proof-of-concept for a niche community. Contributions, improvements, and security reviews are welcome.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Built with ❤️ for the Solana community*
