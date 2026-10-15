import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatEquipmentDay } from "@/lib/equipment-status";
import type { EquipmentCondition } from "@/lib/equipment-condition";

export interface ServiceRecordPdfProps {
  labName: string;
  record: {
    id: string;
    kind: string;
    performedOn: string;
    performedBy: string;
    externalCompany: string | null;
    workPerformed: string | null;
    outcome: string;
    reason: string | null;
    nextDueOn: string | null;
    reference: string | null;
    recordedByName: string;
    recordedAtFormatted: string;
  };
  resource: {
    id: string;
    name: string;
    manufacturer: string | null;
    model: string | null;
    serialNumber: string | null;
    siteName: string;
    sectionName: string | null;
    categoryName: string;
  };
  condition: {
    condition: EquipmentCondition;
    reasons: string[];
  };
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 35,
    paddingBottom: 45,
    paddingHorizontal: 40,
    color: "#1e293b",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#0f766e",
    borderBottomStyle: "solid",
    paddingBottom: 10,
    marginBottom: 16,
  },
  brand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: "#0f766e",
    marginBottom: 3,
  },
  docTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#0f172a",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 8,
    color: "#64748b",
  },
  card: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#0f766e",
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    borderBottomStyle: "solid",
    paddingBottom: 4,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  col: {
    width: "50%",
    marginBottom: 8,
  },
  colFull: {
    width: "100%",
    marginBottom: 8,
  },
  label: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: {
    fontSize: 9,
    color: "#0f172a",
  },
  workBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  workText: {
    fontSize: 8.5,
    lineHeight: 1.3,
    color: "#1e293b",
  },
  badgePass: {
    color: "#047857",
    fontFamily: "Helvetica-Bold",
  },
  badgeFail: {
    color: "#b91c1c",
    fontFamily: "Helvetica-Bold",
  },
  badgeWatch: {
    color: "#b45309",
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    borderTopStyle: "solid",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#94a3b8",
  },
});

export function ServiceRecordPdf({ labName, record, resource, condition }: ServiceRecordPdfProps) {
  return (
    <Document
      title={`Service Record - ${resource.name} (${formatEquipmentDay(record.performedOn)})`}
    >
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>{labName}</Text>
          <Text style={styles.docTitle}>Equipment Service & Verification Record</Text>
          <Text style={styles.subtitle}>
            ISO 15189:2022 §6.4.7 Verification, Calibration & Maintenance Audit Record
          </Text>
        </View>

        {/* 1. Resource Identity Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Resource Identity</Text>
          <View style={styles.grid}>
            <View style={styles.col}>
              <Text style={styles.label}>Resource Name</Text>
              <Text style={[styles.value, { fontFamily: "Helvetica-Bold" }]}>{resource.name}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Category</Text>
              <Text style={styles.value}>{resource.categoryName}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Manufacturer & Model</Text>
              <Text style={styles.value}>
                {resource.manufacturer || "N/A"} {resource.model ? `(${resource.model})` : ""}
              </Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Serial Number</Text>
              <Text style={styles.value}>{resource.serialNumber || "N/A"}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Site Location</Text>
              <Text style={styles.value}>{resource.siteName}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Section</Text>
              <Text style={styles.value}>{resource.sectionName || "General Laboratory"}</Text>
            </View>
          </View>
        </View>

        {/* 2. Service Verification Event Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Service Verification Event</Text>
          <View style={styles.grid}>
            <View style={styles.col}>
              <Text style={styles.label}>Event Type</Text>
              <Text style={[styles.value, { fontFamily: "Helvetica-Bold" }]}>
                {record.kind.replace(/_/g, " ")}
              </Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Date Performed</Text>
              <Text style={styles.value}>{formatEquipmentDay(record.performedOn)}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Performed By</Text>
              <Text style={styles.value}>{record.performedBy}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Service Company</Text>
              <Text style={styles.value}>{record.externalCompany || "Internal Personnel"}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Outcome / Result</Text>
              <Text
                style={[
                  styles.value,
                  record.outcome === "PASS"
                    ? styles.badgePass
                    : record.outcome === "FAIL"
                      ? styles.badgeFail
                      : styles.badgeWatch,
                ]}
              >
                {record.outcome}
              </Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Next Due Date</Text>
              <Text style={styles.value}>
                {record.nextDueOn ? formatEquipmentDay(record.nextDueOn) : "N/A"}
              </Text>
            </View>
            {record.reference && (
              <View style={styles.colFull}>
                <Text style={styles.label}>Reference / Certificate No.</Text>
                <Text style={styles.value}>{record.reference}</Text>
              </View>
            )}
            {record.reason && (
              <View style={styles.colFull}>
                <Text style={styles.label}>Reason / Observations</Text>
                <Text style={styles.value}>{record.reason}</Text>
              </View>
            )}
            <View style={styles.colFull}>
              <Text style={styles.label}>Work Performed / Changes Made</Text>
              <View style={styles.workBox}>
                <Text style={styles.workText}>{record.workPerformed || "None documented."}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. Current Resource Health & Audit Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Current Condition at Download</Text>
          <View style={styles.grid}>
            <View style={styles.col}>
              <Text style={styles.label}>Status Rating</Text>
              <Text
                style={[
                  styles.value,
                  condition.condition === "POOR"
                    ? styles.badgeFail
                    : condition.condition === "WATCH"
                      ? styles.badgeWatch
                      : styles.badgePass,
                ]}
              >
                {condition.condition}
              </Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Active Policy Triggers</Text>
              <Text style={styles.value}>
                {condition.reasons.length > 0 ? condition.reasons.join("; ") : "All current"}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Recorded by {record.recordedByName} on {record.recordedAtFormatted}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
