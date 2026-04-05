import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-800 p-1.5 rounded-lg flex items-center justify-center">
              <GraduationCap className="text-white" size={20} />
            </div>
            <h1 className="font-bold text-lg">AllChat Terms of Service</h1>
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
            <h2 className="text-xl font-bold mb-2">Platform Purpose</h2>
            <p className="text-sm text-gray-700 leading-6">
              AllChat is built for student communication, collaboration, and
              community conversations. The platform currently supports global,
              room, direct, and random chat features for educational and
              community use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">User Responsibilities</h2>
            <p className="text-sm text-gray-700 leading-6">
              You are responsible for using a valid email address, protecting
              your account credentials, and ensuring the information you provide
              is accurate. Do not use fake or disposable identities to abuse
              authentication systems.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">
              Acceptable Behavior in Chat
            </h2>
            <p className="text-sm text-gray-700 leading-6">
              Harassment, hate speech, impersonation, spam, explicit abuse,
              malicious links, and unlawful activity are not allowed. We reserve
              the right to moderate, restrict, or remove access when abuse or
              platform safety risks are detected.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Development Status</h2>
            <p className="text-sm text-gray-700 leading-6">
              AllChat is currently under active development. Features may
              change, and occasional interruptions, bugs, or policy updates can
              occur while we continue to improve reliability and security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">
              Infrastructure and Access
            </h2>
            <p className="text-sm text-gray-700 leading-6">
              Authentication and storage are handled by trusted infrastructure
              providers, including Supabase and Render. Access to user data is
              constrained through managed platform controls, and unnecessary
              personal data access is not part of our product workflow.
            </p>
          </section>

          <p className="text-xs text-gray-500 pt-2">Last updated: April 2026</p>
        </div>
      </main>
    </div>
  );
}
