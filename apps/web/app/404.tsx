export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <h1 className="text-6xl font-bold">404</h1>
            <h2 className="mt-4 text-2xl">Page Not Found</h2>
            <p className="mt-2 text-gray-600">The page you're looking for doesn't exist.</p>
            <a
                href="/"
                className="mt-8 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 transition-colors"
            >
                Go Home
            </a>
        </div>
    );
}
