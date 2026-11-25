# UGC product video studio

The Reel studio now creates **short image-to-video clips** from an existing product photo. It uses the same Muapi submit/poll pattern as the linked Open Higgsfield AI project, but with the documented Wan 2.2 image-to-video endpoint. The linked repository is primarily an image studio and does not provide a finished UGC video or social publishing API. This is an original Next.js integration, not a vendored copy of that application.

## Set up on Vercel

1. Connect the Marketing Manager Vercel project to a **public Vercel Blob** store. The generated video must be reachable by the browser and, later, social publishing services. Let Vercel set `BLOB_READ_WRITE_TOKEN` for the environments connected to the store.
2. In Muapi, create an API key and add `MUAPI_API_KEY` as a server-side Vercel environment variable. Muapi bills successful generation requests; the Generate clip action requires explicit confirmation. Do not use a `NEXT_PUBLIC_` prefix.
3. If Muapi returns an output from a host other than `cdn.muapi.ai`, check that host in your Muapi dashboard and add it as an exact, comma-separated `MUAPI_OUTPUT_HOSTS` entry. The server only downloads generated outputs from these hosts. Never add wildcard or private network hosts.
4. Redeploy. The build applies `db/005_ugc_videos.sql` to Neon. Sign in, choose FoxyAvenue, open **Reel studio**, enter a publicly reachable HTTPS product photo URL and save a concept. Click **Generate clip**, then **Refresh status** until the MP4 appears in the library. Preview the clip, check product fidelity and open/download the MP4.

The source photo needs to be publicly accessible to Muapi. Product images from FoxyAvenue's public site or a public image CDN are suitable. The application does not yet upload product photos directly. A 5-second clip does not contain the typed voiceover, caption or music: record/add those in a video editor or the social app before posting. Add appropriate AI media disclosures if required. Do not present a synthetic person as a real customer testimonial.

The current publishing handoff is **manual**. Upload the reviewed MP4 to TikTok and Instagram and paste the saved caption. Existing social OAuth connections were granted read scopes for Highlights; they do not authorize publishing. Direct posting requires additional app permissions, platform review, creator confirmation and (for TikTok URL pulls) a verified media domain. The UI deliberately does not claim that an asset was published.

## Failure and storage handling

Video concepts and job IDs are stored in Neon and scoped to the selected website. A draft can start one paid generation attempt. Uncertain submissions cannot be retried automatically because a provider call might have succeeded even if the response was lost. Once completed, a server request downloads up to 50 MB from an exact allowed output host and copies the clip to public Vercel Blob. Press **Refresh status** after a temporary storage failure. If a completion URL has expired, inspect Muapi before generating a new draft. Generated public Blob URLs are unguessable but can be shared by anyone holding the link; do not use confidential content.

Provider docs: https://muapi.ai/playground/wan2.2-image-to-video/api · https://muapi.ai/docs/api-reference · https://muapi.ai/image-to-video-api · https://vercel.com/docs/vercel-blob/server-upload
