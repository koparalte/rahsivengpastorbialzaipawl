// import { DatabaseZap } from 'lucide-react'; // No longer needed
// import Link from 'next/link'; // No longer needed

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-end px-4 md:px-6"> {/* Changed justify-between to justify-end */}
        {/* The Link component with the icon and text that was here has been removed */}
        
        {/* Placeholder for future actions like theme toggle or user profile */}
        <div></div>
      </div>
    </header>
  );
}
