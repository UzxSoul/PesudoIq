<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Render the shared SiteFooter once in the root layout, using a flex-column page shell with growing content; this keeps every main page's footer at the natural bottom without overlays or duplication.
- Keep reusable learning-domain validation, scoring, exports and revision derivation in src/features/learning/model.ts so quizzes, imports and tests share the same rules.
- Keep each main learning screen in its own TanStack leaf route; root owns the shared navigation, learning provider, and footer.
- Keep one shared question bank readable by everyone but writable only by accounts with the admin role (user_roles + has_role, enforced in RLS and in every AI/PDF server entry point); attempts and bookmarks stay private per account, or in namespaced browser storage when signed out. This keeps admin control server-side instead of trusting the UI.
- Run Gemini generation in authenticated server functions with request-local gateway helpers, validating before inserting; persist batch history and terminal billing/access blocks, and never auto-retry.

- Read PDF text in the browser with a dynamically loaded PDF.js worker; keep files transient and route AI conversion through an authenticated streaming endpoint, then validate and save only after review. This avoids server filesystem dependencies and accidental bank writes.
