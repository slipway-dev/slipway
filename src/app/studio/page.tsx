
import { SiteFooter } from "@/components/site-footer"
import { SiteNav } from "@/components/site-nav"
import { TaskList } from "@/features/studio/task-list"


export default function StudioIndex() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteNav current="/studio" />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-12 pb-24 md:px-8">
        <TaskList />
      </main>
      <SiteFooter />
    </div>
  )
}
