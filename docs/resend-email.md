# Resend email marketing setup

The Email marketing module sends **Resend Broadcasts** to a subscribed segment for the selected website. Each website has a separate sender and segment. A content plan date remains a planning note until an administrator chooses **Schedule in Resend**. Send now requires explicit confirmation. Resend queues and sends the broadcast; a successful API receipt is not proof of inbox delivery.

## Setup

1. In Resend, verify `foxyavenue.com` and `shapesandpieces.com` for sending. Create a sender address for each brand, such as `Foxyavenue <hello@foxyavenue.com>` and `Shapes and Pieces <hello@shapesandpieces.com>`; use addresses you control.
2. Import contacts who have consented to marketing into Resend and create a **separate segment for each brand**. Manage suppression, unsubscribe and consent in Resend. Do not add customers to the other brand's segment without their permission.
3. Create a Resend API key with the permissions required to retrieve segments and create/read broadcasts. In Vercel → marketingmanager → Settings → Environment Variables, configure `RESEND_API_KEY` (secret), `RESEND_FROM_FOXYAVENUE`, `RESEND_SEGMENT_ID_FOXYAVENUE`, `RESEND_FROM_SHAPES_AND_PIECES`, `RESEND_SEGMENT_ID_SHAPES_AND_PIECES` for Production. Add distinct Preview credentials and segments if using preview deployments. Values belong on the server; do not prefix them with `NEXT_PUBLIC_` or commit them to Git.
4. Redeploy so the new environment variables are available. The build automatically applies `004_email_broadcasts.sql` in the connected Neon database.
5. Sign in, choose a website, and use Settings → Resend → **Verify connection** to confirm that the configured key can read its segment. Save a campaign with a subject and message in Email marketing, then choose **Send now** or set a future date and choose **Schedule in Resend**. Confirm the brand, sender and subscribed audience before submitting.

The application renders campaign text as escaped HTML and includes a Resend unsubscribe URL token in both HTML and plain text. Resend resolves it separately for each contact. Drafts are read from Neon at submission time. A unique dispatch record prevents repeat submission of the same campaign; after submitting, create a new campaign for future sends. A network timeout or uncertain Resend result is recorded as **unknown** and requires checking the Resend dashboard before creating another campaign. This avoids accidental duplicate broadcasts. Use **Refresh status** when a Resend receipt is available. Resend's own dashboard remains the source for recipient counts, delivery and engagement metrics.

The API key is never returned to the browser, stored in Neon or printed in application logs. All campaign and receipt queries are scoped to the chosen website. The existing `StrozpyManager` account has access to both websites; this release does not add staff-level send approval roles.

API endpoints: `GET /api/email/config?workspace=…`, `GET /api/email/config?workspace=…&verify=1`, `GET /api/email/dispatch?workspace=…`, `POST /api/email/dispatch` with `{workspace,contentId,mode}`, and `POST /api/email/status?workspace=…&contentId=…`. Mutations require a valid administrator session and matching request origin.

Provider references: https://resend.com/docs/api-reference/broadcasts/create-broadcast · https://resend.com/docs/api-reference/segments/get-segment · https://resend.com/docs/dashboard/broadcasts/introduction
