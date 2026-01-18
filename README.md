# openlawdata-bigquery

โครงการ mirror [ชุดข้อมูล](https://huggingface.co/datasets/open-law-data-thailand)จากโครงการ [Open Law Data Thailand](https://www.openlawdatathailand.org/) ขึ้นไปยัง [Google BigQuery](https://cloud.google.com/bigquery) เพื่อให้สามารถ query ข้อมูลได้สะดวก

## การเข้าถึงข้อมูลผ่าน BigQuery

Dataset นี้เปิดเป็น public ให้ทุกคนเข้าถึงได้ฟรี โดยทุกคนสามารถใช้ [BigQuery Sandbox](https://cloud.google.com/bigquery/docs/sandbox) ในการวิเคราะห์ข้อมูลได้ฟรีผ่านเว็บเบราว์เซอร์ เพียงแค่มีบัญชี Google ไม่ต้องติดตั้งโปรแกรมใดๆ เพิ่มเติม และไม่ต้องผูกบัตรเครดิต

**BigQuery Dataset:**

- 👉 [`sourceinth.openlawdata_soc_ratchakitcha`](https://console.cloud.google.com/bigquery?project=sourceinth&ws=!1m4!1m3!3m2!1ssourceinth!2sopenlawdata_soc_ratchakitcha)

### ตาราง

| ตาราง      | คำอธิบาย                                                              | จำนวนแถว   |
| ---------- | --------------------------------------------------------------------- | ---------- |
| `meta`     | ข้อมูล metadata ของเอกสาร (ชื่อเรื่อง, วันที่ประกาศ, หมวด, เล่ม, ตอน) | ~1.36 ล้าน |
| `ocr_iapp` | ผลลัพธ์ OCR ของเอกสาร (ข้อความเต็มในรูปแบบ markdown)                  | ~300,000   |

### Schema

ทั้งสองตารางมี schema เหมือนกัน:

| Column          | Type   | คำอธิบาย                                |
| --------------- | ------ | --------------------------------------- |
| `content`       | JSON   | ข้อมูลหลักของเอกสาร                     |
| `filename`      | STRING | ชื่อไฟล์ต้นทาง                          |
| `line_number`   | INT64  | หมายเลขบรรทัดในไฟล์ต้นทาง               |
| `publish_month` | DATE   | เดือนที่ประกาศ (ใช้สำหรับ partitioning) |
| `file_commit`   | STRING | Git commit hash ของไฟล์ต้นทาง           |

## วิธีใช้งาน BigQuery Sandbox

อ่านวิธีใช้งาน BigQuery Sandbox แบบเต็มได้ที่[เอกสารของ Google](https://docs.cloud.google.com/bigquery/docs/sandbox)

1. ไปที่ [BigQuery Console](https://console.cloud.google.com/bigquery)
2. สร้าง Google Cloud project ใหม่ (หรือใช้ project ที่มีอยู่)
3. กดที่ "+ SQL query" ด้านบนซ้ายเพื่อเปิด query editor
4. ในช่อง query editor ลองรัน query ด้านล่าง

### ตัวอย่าง Query

**นับจำนวนประกาศในแต่ละปี:**

```sql
SELECT
  EXTRACT(YEAR FROM publish_month) AS year,
  COUNT(*) AS articles
FROM `sourceinth.openlawdata_soc_ratchakitcha.meta`
GROUP BY year
ORDER BY year DESC
LIMIT 10
```

**ค้นหาพระราชบัญญัติในปี 2024:**

```sql
SELECT
  JSON_VALUE(content, '$.doctitle') AS title,
  JSON_VALUE(content, '$.publishDate') AS publish_date
FROM `sourceinth.openlawdata_soc_ratchakitcha.meta`
WHERE JSON_VALUE(content, '$.doctitle') LIKE '%พระราชบัญญัติ%'
  AND publish_month >= '2024-01-01'
LIMIT 10
```

**ค้นหาข้อความใน OCR:**

```sql
SELECT
  JSON_VALUE(content, '$.pdf_file') AS pdf_file,
  SUBSTR(JSON_VALUE(content, '$.data.ocr_results[0].markdown_output'), 1, 500) AS text_preview
FROM `sourceinth.openlawdata_soc_ratchakitcha.ocr_iapp`
WHERE JSON_VALUE(content, '$.data.ocr_results[0].markdown_output') LIKE '%สมรส%'
  AND publish_month >= '2024-01-01'
ORDER BY publish_month DESC
LIMIT 10
```

## สำหรับผู้พัฒนา

โปรเจกต์นี้ sync ข้อมูลจาก HuggingFace ไปยัง BigQuery โดยอัตโนมัติผ่าน GitHub Actions ทุกวัน

**Tech stack:** Bun, TypeScript, @google-cloud/bigquery
