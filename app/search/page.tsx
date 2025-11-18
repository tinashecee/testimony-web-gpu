"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import SearchBar from "../../components/SearchBar";
import {
  recordingsApi,
  type Recording,
  type Court,
  type Courtroom,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { RecordingList } from "@/components/RecordingList";

export default function Search() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [courtrooms, setCourtrooms] = useState<Courtroom[]>([]);
  const [term, setTerm] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Role-based recordings for search scope
        const role = user?.role;
        let recs: Recording[] = [];
        if (!role) {
          recs = await recordingsApi.getAllRecordings();
        } else if (
          ["station_magistrate", "resident_magistrate"].includes(role) &&
          (user as any)?.district
        ) {
          recs = await recordingsApi.getRecordingsByDistrict(
            (user as any).district as string
          );
        } else if (
          role === "provincial_magistrate" &&
          (user as any)?.province
        ) {
          recs = await recordingsApi.getRecordingsByProvince(
            (user as any).province as string
          );
        } else if (role === "regional_magistrate" && (user as any)?.region) {
          recs = await recordingsApi.getRecordingsByRegion(
            (user as any).region as string
          );
        } else if (
          [
            "senior_regional_magistrate",
            "judge",
            "super_admin",
            "admin",
          ].includes(role)
        ) {
          recs = await recordingsApi.getAllRecordings();
        } else {
          recs = await recordingsApi.getAllRecordings();
        }

        const [crts, rms] = await Promise.all([
          recordingsApi.getCourts(),
          recordingsApi.getCourtrooms(),
        ]);
        setRecordings(recs);
        setCourts(crts);
        setCourtrooms(rms);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [
    user?.role,
    (user as any)?.district,
    (user as any)?.province,
    (user as any)?.region,
  ]);

  const normalized = (value: string) => value.toLowerCase();

  const filtered = useMemo(() => {
    if (!term.trim()) return recordings;
    const q = normalized(term);
    return recordings.filter((r) => {
      return (
        normalized(r.case_number || "").includes(q) ||
        normalized(r.title || "").includes(q) ||
        normalized(r.judge_name || "").includes(q) ||
        normalized(r.court || "").includes(q) ||
        normalized(r.courtroom || "").includes(q) ||
        normalized(r.notes || "").includes(q) ||
        normalized(r.transcript || "").includes(q)
      );
    });
  }, [recordings, term]);

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Search</h1>
      <SearchBar onSearch={setTerm} defaultValue={term} />

      {loading ? (
        <div className="mt-6">Loading...</div>
      ) : (
        <div className="mt-6">
          <RecordingList
            recordings={filtered}
            pageSize={10}
            courts={courts}
            courtrooms={courtrooms}
          />
        </div>
      )}
    </Layout>
  );
}
