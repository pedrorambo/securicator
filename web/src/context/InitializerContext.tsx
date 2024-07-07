import {
  FC,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Profile } from "./Profile";
import { importSymmetricKeyFromPassword } from "../utils/importSymmetricKeyFromPassword";

const InitializerContext = createContext<any>({});

export const InitializerProvider: FC<any> = ({ children }) => {
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [profileSymmetricKey, setProfileSymmetricKey] = useState<any>(null);

  useEffect(() => {
    const profiles = Profile.getProfiles();
    setProfiles(profiles);
  }, []);

  useEffect(() => {
    const currentProfile = window.sessionStorage.getItem("current-profile");
    if (currentProfile) {
      const parsed = JSON.parse(currentProfile);
      Profile.loadProfile(parsed.profileId, parsed.key).then((profile) => {
        setProfileId(profile.id);
        setProfileSymmetricKey(profile.symmetricKey);
      });
    }
  }, []);

  const addProfile = useCallback(async (password: string) => {
    const key = await importSymmetricKeyFromPassword(password);
    Profile.newProfile(key).then((profile) => {
      setProfileId(profile.id);
      setProfileSymmetricKey(profile.symmetricKey);
      window.sessionStorage.setItem(
        "current-profile",
        JSON.stringify({ profileId: profile.id, key })
      );
    });
  }, []);

  return (
    <InitializerContext.Provider
      value={{ profiles, addProfile, profileId, profileSymmetricKey }}
    >
      {children}
    </InitializerContext.Provider>
  );
};

export const useInitializer = () => {
  return useContext(InitializerContext);
};
