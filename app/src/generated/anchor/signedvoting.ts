/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/signedvoting.json`.
 */
export type Signedvoting = {
  "address": "3iUNbQUnm5EfJVLvXtoU3o8h3JXuBeEQ8zL6tkD9n7zb",
  "metadata": {
    "name": "signedvoting",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createProposal",
      "discriminator": [
        132,
        116,
        68,
        174,
        216,
        160,
        198,
        22
      ],
      "accounts": [
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "author"
              },
              {
                "kind": "arg",
                "path": "hash"
              }
            ]
          }
        },
        {
          "name": "author",
          "writable": true,
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "uri",
          "type": "string"
        },
        {
          "name": "hash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "vote",
      "discriminator": [
        227,
        110,
        155,
        23,
        136,
        126,
        172,
        25
      ],
      "accounts": [
        {
          "name": "vote",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "proposal"
              },
              {
                "kind": "account",
                "path": "voter"
              }
            ]
          }
        },
        {
          "name": "proposal",
          "writable": true
        },
        {
          "name": "voter",
          "writable": true,
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "choice",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "proposal",
      "discriminator": [
        26,
        94,
        189,
        187,
        116,
        136,
        53,
        33
      ]
    },
    {
      "name": "vote",
      "discriminator": [
        96,
        91,
        104,
        57,
        145,
        35,
        172,
        155
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidPayer",
      "msg": "Invalid payer - must be the proposal's original payer"
    }
  ],
  "types": [
    {
      "name": "proposal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "author",
            "type": "pubkey"
          },
          {
            "name": "payer",
            "type": "pubkey"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "vote",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "proposalId",
            "type": "pubkey"
          },
          {
            "name": "choice",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
