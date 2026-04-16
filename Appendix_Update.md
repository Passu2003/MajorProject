# Updated Project Appendix: Meet.AI

**Appendix-A: Node.js and Project Setup**
1. Open a web browser and visit the official Node.js website:
https://nodejs.org/
2. Download and install the LTS version of Node.js.
3. Verify installation using the terminal:
   ```bash
   node -v
   npm -v
   ```
4. Create a new Next.js project:
   ```bash
   npx create-next-app@latest meet-ai
   ```
5. Navigate into the project directory:
   ```bash
   cd meet-ai
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

**Appendix-B: Tailwind CSS & shadcn/ui Installation**
1. Install Tailwind CSS v4, PostCSS, and necessary dependencies:
   ```bash
   npm install tailwindcss @tailwindcss/postcss postcss autoprefixer
   ```
2. Initialize `shadcn/ui` (which uses Radix UI components under the hood):
   ```bash
   npx shadcn@latest init
   ```
3. Install animation and utility dependencies used by the UI:
   ```bash
   npm install tailwindcss-animate class-variance-authority clsx tailwind-merge lucide-react
   ```
4. Add Tailwind directives into `app/globals.css`.
5. Restart the development server:
   ```bash
   npm run dev
   ```

**Appendix-C: StreamSDK, WebRTC & AI Integration Setup**
1. Install the Stream Video SDKs for core video infrastructure:
   ```bash
   npm install @stream-io/video-react-sdk @stream-io/node-sdk
   ```
2. Install auxiliary WebRTC libraries for real-time socket connections:
   ```bash
   npm install simple-peer socket.io socket.io-client
   ```
3. Install multimedia and AI processing tools for transcriptions and voice services:
   ```bash
   npm install openai fluent-ffmpeg @ffmpeg-installer/ffmpeg
   ```
4. Add environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_STREAM_VIDEO_API_KEY=your_stream_api_key
   STREAM_VIDEO_SECRET_KEY=your_stream_secret_key
   OPENAI_API_KEY=your_openai_api_key
   ```

**Appendix-D: Authentication Setup**
1. The project currently relies on custom UI mockups for authentication.
2. Build custom login and signup interfaces (e.g., inside `app/login/page.tsx` and `app/signup/page.tsx`) utilizing `shadcn/ui` components that redirect directly to the `/dashboard`.
3. *(Future Step)* You can integrate libraries like Clerk or NextAuth later if genuine OAuth providers (Google, GitHub) are required. 
4. Verify the frontend login routing flow:
   ```bash
   npm run dev
   ```

**Appendix-E: Database and Deployment**
1. The application's core data currently leverages Stream SDK’s backend metadata and localized mock states (no direct ORM like Prisma is configured yet).
2. Deploy the Next.js project using Vercel:
   ```bash
   npm install -g vercel
   vercel
   ```
3. During deployment, ensure that all required environment variables (`NEXT_PUBLIC_STREAM_VIDEO_API_KEY`, `STREAM_VIDEO_SECRET_KEY`, and `OPENAI_API_KEY`) are configured inside your Vercel project dashboard.
4. Access the deployed application URL after a successful build.
