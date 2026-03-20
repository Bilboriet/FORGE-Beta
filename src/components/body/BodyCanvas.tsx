import { useEffect, useState } from "react";

type Props = {
  view: "front" | "back";
};

export function BodyCanvas({ view }: Props) {
  const [missingBack, setMissingBack] = useState(false);
  const src = view === "back" ? "/body/body_back.png" : "/body/body_front.png";

  useEffect(() => {
    if (view !== "back") {
      setMissingBack(false);
    }
  }, [view]);

  return (
    <div className="bodyV2Canvas">
      {view === "back" && missingBack ? (
        <div className="bodyV2CanvasFallback">Back image not added yet</div>
      ) : (
        <img
          className="bodyV2BodyImg bodyV2BodyImage"
          src={src}
          alt={view === "back" ? "Body back" : "Body front"}
          onError={() => {
            if (view === "back") setMissingBack(true);
          }}
        />
      )}
    </div>
  );
}

export default BodyCanvas;
