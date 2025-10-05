// import VideoRectangleAnnotator from "./component/VideoRectangleAnnotator";

// export default function App() {
//   return (
//     <div style={{ padding: 16 }}>
//       <VideoRectangleAnnotator
//         src="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4"
//         maxSize={500}
//       />
//     </div>
//   );
// }


import React from "react";
import AntMediaRectangleOverlay from "./component/AntMediaRectangleOverlay";
export default function App() {
  return (
    <div style={{ padding: 16 }}>
      <AntMediaRectangleOverlay
        httpBaseURL="https://your-antmedia-domain:5443/WebRTCAppEE" // Sunucu/uygulama URL'iniz
        streamId="yourStreamId"                                      // Yayın ID
        token={undefined}                                            // Token kullanıyorsanız string verin
        playOrder={["webrtc", "hls", "dash"]}
        autoplay={true}
        muted={true}
        maxRect={500}
        fit="cover"                                                  // "cover" ekranı doldurur; "contain" kırpmaz
        startEnabled={false}
        containerStyle={{ width: "100%", height: "60vh" }}           // Tam ekran için height: "100vh"
      />
    </div>
  );
}