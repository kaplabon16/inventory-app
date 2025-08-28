import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api, { apiUrl } from "../api/client";
import { useAuth } from "../store/auth";
import Table from "../components/Table";

export default function Home() {
  const [rows, setRows] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get(apiUrl("/inventories"), { params: { take: 10 } });
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        if (active) setRows(data);
      } catch {
        if (active) setRows([]);
      }
    })();
    return () => (active = false);
  }, []);

  const createClicked = () => {
    if (!user) return navigate("/login");
    navigate("/inventories"); // creation handled on Inventories page
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium">Inventories</h2>
        <button onClick={createClicked} className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">
          Create inventory
        </button>
      </div>

      <Table
        columns={[
          { key: "title", title: "Title" },
          { key: "categoryName", title: "Category" },
          { key: "ownerName", title: "Owner" },
          { key: "itemsCount", title: "Items" },
        ]}
        rows={rows}
      />
    </div>
  );
}
