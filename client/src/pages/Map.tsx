import { Layout } from "@/components/Layout";
import { useJobs } from "@/hooks/use-jobs";
import { MapPin, ExternalLink } from "lucide-react";

export default function MapPage() {
  const { data: jobs } = useJobs({ status: 'scheduled' });

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Route Map</h1>
        <p className="text-muted-foreground">View job locations and plan routes</p>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-lg h-[600px] flex items-center justify-center relative bg-muted/20">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Map Integration Placeholder</h2>
          <p className="text-muted-foreground mb-6">
            In a production environment, this would integrate with Google Maps API or Mapbox to show real-time pins for the locations below.
          </p>
        </div>

        {/* Overlay list of locations */}
        <div className="absolute top-4 right-4 w-80 max-h-[560px] overflow-y-auto bg-white/90 backdrop-blur shadow-2xl rounded-xl border border-border p-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Today's Stops</h3>
          <div className="space-y-3">
            {jobs?.map((job, idx) => (
              <div key={job.id} className="p-3 bg-white rounded-lg border border-border shadow-sm hover:border-primary transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{job.client.name}</p>
                    <p className="text-xs text-muted-foreground truncate mb-2">{job.client.address}</p>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.client.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary flex items-center hover:underline"
                    >
                      Open in Maps <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
            {!jobs?.length && <p className="text-xs text-center text-muted-foreground">No scheduled jobs.</p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
