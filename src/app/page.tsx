import { createSession } from "./actions";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col gap-6 w-full max-w-sm p-8 bg-white rounded-xl shadow-sm border">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-3xl font-bold">Backyard Ladder</h1>
          <p className="text-gray-500 text-sm">Session-based ranking for local sports</p>
        </div>
        <form action={createSession} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="sport" className="text-sm font-medium">
              Sport
            </label>
            <select
              id="sport"
              name="sport"
              required
              className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="Pickleball">Pickleball</option>
              <option value="Cornhole">Cornhole</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-black text-white rounded-md px-4 py-2 font-medium text-sm hover:bg-gray-800 transition-colors"
          >
            Create Session
          </button>
        </form>
      </div>
    </main>
  );
}
