"""Supabase client service for logging and realtime-friendly inserts."""

import os
from typing import Dict, Any

try:
    from supabase import create_client, Client
except Exception:
    create_client = None
    Client = None


class SupabaseService:
    def __init__(self):
        self.url = os.getenv('SUPABASE_URL')
        self.key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')
        self.client = None
        if self.url and self.key and create_client:
            self.client = create_client(self.url, self.key)

    def insert(self, table: str, record: Dict[str, Any]):
        if not self.client:
            return None
        return self.client.table(table).insert(record).execute()


supabase_service = SupabaseService()

