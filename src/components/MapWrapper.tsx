import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#0d1117] rounded-lg flex items-center justify-center">
      <p className="text-[#374151] text-sm">Initialising map...</p>
    </div>
  ),
});

export default LeafletMap;
