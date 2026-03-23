// dbAdapter.js - Unified database interface for Base44 and mock environments

const mockDB = {
  projects: [],
  mediaAssets: [],
  timelines: {}
};

export const db =
  globalThis.__B44_DB__ ??
  {
    auth: {
      isAuthenticated: async () => true,
      me: async () => ({ id: "demo-user" })
    },

    entities: {
      Project: {
        filter: async () => mockDB.projects,
        create: async (data) => {
          const p = { id: crypto.randomUUID(), ...data, created_date: new Date(), updated_date: new Date() };
          mockDB.projects.push(p);
          return p;
        }
      },

      MediaAsset: {
        filter: async () => mockDB.mediaAssets,
        create: async (data) => {
          const m = { id: crypto.randomUUID(), ...data, created_date: new Date() };
          mockDB.mediaAssets.push(m);
          return m;
        }
      },

      Timeline: {
        get: async (id) => mockDB.timelines[id] || null,
        update: async (id, data) => {
          mockDB.timelines[id] = { id, ...data, updated_date: new Date() };
          return mockDB.timelines[id];
        },
        create: async (data) => {
          const t = { id: crypto.randomUUID(), ...data, created_date: new Date(), updated_date: new Date() };
          mockDB.timelines[t.id] = t;
          return t;
        }
      }
    },

    integrations: {
      Core: {
        UploadFile: async (file) => {
          return {
            file_url: URL.createObjectURL(file)
          };
        }
      }
    }
  };
