import { Layout } from "@/components/Layout";
import { useFeedback } from "@/hooks/use-feedback";
import { format } from "date-fns";
import { MessageSquare, Sparkles } from "lucide-react";

export default function Feedback() {
  const { data: feedback, isLoading } = useFeedback();

  if (isLoading) return <div className="p-8">Loading feedback...</div>;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Client Feedback</h1>
        <p className="text-muted-foreground">AI-analyzed ratings and reviews from completed jobs</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {feedback?.map((item) => (
          <div key={item.id} className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                 <div className="flex items-center gap-3 mb-2">
                   <div className="flex gap-1">
                     {[...Array(5)].map((_, i) => (
                       <Star key={i} className={`w-5 h-5 ${i < item.rating ? 'fill-accent text-accent' : 'text-muted-foreground/30'}`} />
                     ))}
                   </div>
                   <span className="text-sm font-semibold text-muted-foreground">
                     {format(new Date(item.createdAt), 'PPP')}
                   </span>
                 </div>
                 
                 <div className="flex items-center gap-2 mb-4 text-sm font-medium text-primary">
                   <span className="bg-primary/10 px-2 py-1 rounded">Job #{item.jobId}</span>
                   {item.job && <span className="text-foreground">for {item.job.status}</span>}
                 </div>

                 <p className="text-lg text-foreground italic mb-4">"{item.comment}"</p>
              </div>

              <div className="w-full md:w-1/3 bg-muted/30 rounded-xl p-4 border border-border/50">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-bold text-sm uppercase tracking-wide">AI Analysis</span>
                </div>
                <div className={`text-xs font-bold uppercase mb-2 ${
                  item.sentiment === 'positive' ? 'text-green-600' : 
                  item.sentiment === 'negative' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  Sentiment: {item.sentiment}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.aiAnalysis || "Analysis pending..."}
                </p>
              </div>
            </div>
          </div>
        ))}
        {!feedback?.length && (
          <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed border-border">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No feedback received yet.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Star(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  )
}
