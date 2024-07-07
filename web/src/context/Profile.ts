import { generateSymmetricKey } from "../utils/generateSymmetricKey";
import { symmetricDecrypt } from "../utils/symmetricDecrypt";
import { symmetricEncrypt } from "../utils/symmetricEncrypt";

export class Profile {
  static getProfiles() {
    const profiles = window.localStorage.getItem("profiles");
    if (!profiles) return [];
    return JSON.parse(profiles);
  }

  static getProfileById(id: any) {
    const profiles = Profile.getProfiles();
    return profiles.find((p: any) => p.id === id);
  }

  static _getNextProfileId() {
    const profiles = Profile.getProfiles();
    const ids = profiles.map((p: any) => p.id);
    if (!ids.length) return 1;
    return Math.max(...ids) + 1;
  }

  static _saveProfiles(profiles: any) {
    window.localStorage.setItem("profiles", JSON.stringify(profiles));
  }

  static async newProfile(password: any) {
    const symmetricKey = await generateSymmetricKey();
    const encryptedSymmetricKey = await symmetricEncrypt(
      symmetricKey,
      password
    );

    const prof = {
      id: Profile._getNextProfileId(),
      encryptedSymmetricKey: encryptedSymmetricKey.encrypted,
      encryptedSymmetricKeyIv: encryptedSymmetricKey.iv,
    };

    const profiles = Profile.getProfiles();
    profiles.push(prof);
    Profile._saveProfiles(profiles);

    return {
      ...prof,
      symmetricKey,
    };
  }

  static async loadProfile(profileId: any, password: any) {
    const profile = Profile.getProfileById(profileId);
    if (!profile) throw new Error(`Profile with id ${profileId} not found`);
    const symmetricKey = await symmetricDecrypt(
      profile.encryptedSymmetricKey,
      password,
      profile.encryptedSymmetricKeyIv
    );
    return {
      ...profile,
      symmetricKey,
    };
  }
}
