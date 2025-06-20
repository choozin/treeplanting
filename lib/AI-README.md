# AI Developer Directives & Project Context

**Attention AI:** You are an expert senior Next.js developer. Before performing any action, you must read and adhere to all principles in this document. Your primary role is to assist in building this application by iteratively creating and refining components based on the provided files and context.

## Core Development Principles & Directives

1.  **Modify, Never Recreate:** When asked to update a file, you must work from the most recent, complete version of that file provided in the prompt's context. You are strictly forbidden from rewriting a file from your own memory or from scratch. Apply only the specific, necessary modifications. All other existing code, logic, and structure must be preserved exactly as it is.

2.  **The Unabridged File Rule:** When asked for a file to be updated, you must always provide the entire, complete, and unabridged file contents from top to bottom. Do not use placeholder comments like `// ...` or any other form of summarization. Do not omit any sections, even if they are unchanged. Every response containing a file must be the complete file.

3.  **The Workflow: Confirm, Then Code:** For any new feature request, you must follow this exact three-step process:
    a. **Ask Clarifying Questions:** First, ask clarifying questions to ensure a perfect, unambiguous understanding of the requirements.
    b. **Present a Final Plan:** After the details are provided, present a detailed, final plan for review. This plan must include any proposed database schema changes and a list of all files you intend to modify.
    c. **Await Approval:** You must wait for explicit confirmation (e.g., "Approved," "Proceed") before writing a single line of code.

4.  **Use Mantine UI:** Always use state-managed components from the Mantine UI library for any user-facing UI. This includes, but is not limited to, notifications and modals. Do not use legacy browser functions like `window.alert()`.

5.  **Write Robust, Error-Proof Code:** All generated code must be production-quality. It must gracefully handle potential data fetching errors or unexpected null/undefined values from the database, using features like optional chaining (`?.`) and nullish coalescing (`??`).

6.  **No Unrequested Cleanup:** Do not remove any code you deem "unnecessary" without explicit permission. Only add to or make changes to specific parts of the code that are directly related to the approved task. No refactoring or other unrequested modifications.

## Firebase Realtime Database Schema

This schema is inferred from the application code.

```json
{
  "camps": {
    "$campID": {
      "campName": "String",
      "companyId": "String",
      "activeLocationId": "String",
      "users": {
        "$userID": {
          "role": "Number"
        }
      },
      "crews": {
        "$crewID": {
          "crewName": "String",
          "crewBosses": {
            "$userID": true
          }
        }
      },
      "campLocations": {
        "$year": {
          "$locationID": {
            "campLocationName": "String",
            "latLong": {
              "latitude": "Number",
              "longitude": "Number"
            },
            "secondaryLocations": {
              "$secondaryLocationID": {
                "name": "String",
                "latLong": {
                  "latitude": "Number",
                  "longitude": "Number"
                }
              }
            }
          }
        }
      },
      "polls": {
        "$pollID": {
          // ... see PollsPage.tsx for full schema
        }
      },
      "classifieds": {
        "$postID": {
          // ... see AddPostModal.jsx for full schema
        }
      },
      "music_recommendations": {
        "$songID": {
          // ... see AddSongModal.jsx for full schema
        }
      }
    }
  },
  "companies": {
    "$companyID": {
      "companyName": "String"
    }
  },
  "users": {
    "$userID": {
      "name": "String",
      "email": "String",
      "role": "Number", // Global role
      "assignedCamps": {
        "$campID": {
          "campName": "String",
          "role": "Number" // Camp-specific role
        }
      },
      "profile": {
        "fullName": "String",
        "nickname": "String",
        "birthday": "String (YYYY-MM-DD)",
        "isFullNameVisible": "Boolean",
        "isBirthdayVisible": "Boolean"
      },
      "weatherPreferences": {
        // ... see WeatherProvider.tsx for schema
      }
    }
  },
  "messages": {
    "$messageID": {
      // ... see MessagesPage.js for schema
    }
  },
  "user-inboxes": {
    "$userID": {
      "$messageID": {
        // ... see MessagesPage.js for schema
      }
    }
  }
}