import { useCallback, useState } from "react";
import { useInitializer } from "../../context/InitializerContext";

export function Initialize() {
  const { profiles, addProfile, profileId } = useInitializer();
  const [password, setPassword] = useState<string>("");

  const onSubmit = useCallback(() => {
    addProfile(password);
  }, [password, addProfile]);

  if (profileId) return null;

  return (
    <div className="center-content">
      <div className="center-content-inner">
        <form
          className="generic-form"
          id="load-profile-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div id="profiles"></div>
          <label htmlFor="its-public-key">Password</label>
          <input
            type="password"
            id="profile-password"
            placeholder="Encryption password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Submit</button>
        </form>
      </div>
    </div>
  );
}
