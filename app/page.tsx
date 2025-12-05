import { CommandPalette } from "@/components/shared/CommandPalette";
import { GlobalSearch } from "@/components/shared/GlobalSearch";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";

export default function Home() {
  return (
    <div>
      <Navbar />
      <Sidebar />
      <CommandPalette />
      <GlobalSearch />
    </div>
  );
}
