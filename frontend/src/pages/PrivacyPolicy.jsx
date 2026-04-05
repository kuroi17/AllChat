import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-800 p-1.5 rounded-lg flex items-center justify-center">
              <GraduationCap className="text-white" size={20} />
            </div>
            <h1 className="font-bold text-lg">AllChat Privacy Policy</h1>
          </div>
          <Link
            to="/auth"
            className="text-sm font-semibold text-red-700 hover:text-red-800"
          >
            Back to Sign In
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          <section>
            <h2 className="text-xl font-bold mb-2">Data We Collect</h2>
            <p className="text-sm text-gray-700 leading-6">
              We collect only the data required to operate the service,
              including authentication email, profile details you provide
              (username, avatar, bio), and chat-related metadata needed for app
              functionality and moderation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">How Data Is Stored</h2>
            <p className="text-sm text-gray-700 leading-6">
              Authentication, database records, and storage operations are
              handled through Supabase-managed infrastructure. Application
              hosting and service runtime are handled through Render-managed
              infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Security and Access</h2>
            <p className="text-sm text-gray-700 leading-6">
              We follow a minimal-access approach. The development workflow is
              designed so developers do not directly process unnecessary
              personal information. Platform-level controls are used for
              authentication and storage safeguards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Data Minimization</h2>
            <p className="text-sm text-gray-700 leading-6">
              We do not intentionally collect unnecessary personal data. Please
              avoid sharing sensitive personal information in chat content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Policy Changes</h2>
            <p className="text-sm text-gray-700 leading-6">
              This policy may be updated as the platform evolves. Continued use
              of the app after updates means you accept the revised policy.
            </p>
          </section>

          <p className="text-xs text-gray-500 pt-2">Last updated: April 2026</p>
        </div>
      </main>
    </div>
  );
}
