from odoo import api, fields, models
import json
import requests

class InvRecord(models.Model):
    _name = "inv.record"
    _description = "Imported Inventory"
    _rec_name = "title"

    title = fields.Char(required=True)
    description = fields.Text()
    import_url = fields.Char(string="Import URL")
    # numeric aggregates
    num1_min = fields.Float()
    num1_med = fields.Float()
    num1_avg = fields.Float()
    num1_max = fields.Float()
    num2_min = fields.Float()
    num2_med = fields.Float()
    num2_avg = fields.Float()
    num2_max = fields.Float()
    num3_min = fields.Float()
    num3_med = fields.Float()
    num3_avg = fields.Float()
    num3_max = fields.Float()
    # text popular values / extended as JSON text
    popular_text_json = fields.Text(string="Popular Text (JSON)")
    fields_json = fields.Text(string="Fields (JSON)")

    @api.model
    def import_from_url(self, import_url):
        if not import_url:
            raise ValueError("Import URL is required")
        r = requests.get(import_url, timeout=30)
        r.raise_for_status()
        data = r.json()

        inv = data.get("inventory") or {}
        ag = (data.get("aggregates") or {})
        nums = ag.get("numbers") or {}
        pop = ag.get("popularText") or []
        fdefs = data.get("fields") or []

        rec = self.create({
            "title": inv.get("title"),
            "description": inv.get("description"),
            "import_url": import_url,
            "num1_min": (nums.get("num1") or {}).get("min") or 0.0,
            "num1_med": (nums.get("num1") or {}).get("median") or 0.0,
            "num1_avg": (nums.get("num1") or {}).get("avg") or 0.0,
            "num1_max": (nums.get("num1") or {}).get("max") or 0.0,
            "num2_min": (nums.get("num2") or {}).get("min") or 0.0,
            "num2_med": (nums.get("num2") or {}).get("median") or 0.0,
            "num2_avg": (nums.get("num2") or {}).get("avg") or 0.0,
            "num2_max": (nums.get("num2") or {}).get("max") or 0.0,
            "num3_min": (nums.get("num3") or {}).get("min") or 0.0,
            "num3_med": (nums.get("num3") or {}).get("median") or 0.0,
            "num3_avg": (nums.get("num3") or {}).get("avg") or 0.0,
            "num3_max": (nums.get("num3") or {}).get("max") or 0.0,
            "popular_text_json": json.dumps(pop, ensure_ascii=False, indent=2),
            "fields_json": json.dumps(fdefs, ensure_ascii=False, indent=2),
        })
        return rec.id
