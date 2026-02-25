
"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import "../../styles/pages/add-new-batch.css";

const MATERIAL_CATEGORY = {
    "PADDY STRAW": "straw",
    "WHEAT STRAW": "straw",
    "BAGASSE": "straw",
    "O/P - C/M -1 TENI": "manure",
    "O/P C/M-2": "manure",
    "GYPSUM": "gypsum",
    "WHEAT BRAN": "additive",
    "SUNFLOWER CAKE": "additive",
    "UREA": "additive",
    "AMMONIUM SULPHATE": "additive",
    "SS PHOSPHATE": "additive",
};

const INITIAL_MATERIALS = [
    { id: 1, name: "PADDY STRAW", freshWeight: "", moist: "", dryWt: "", n2Percent: "", totalN2: "", totalshPercent: "", totalAsh: "", rowPercent: "" },
    { id: 2, name: "WHEAT STRAW", freshWeight: "", moist: "", dryWt: "", n2Percent: "", totalN2: "", totalshPercent: "", totalAsh: "", rowPercent: "" },
    { id: 3, name: "BAGASSE", freshWeight: "", moist: "", dryWt: "", n2Percent: "", totalN2: "", totalshPercent: "", totalAsh: "", rowPercent: "" },
    { id: 4, name: "WHEAT BRAN", freshWeight: "", moist: "", dryWt: "", n2Percent: "", totalN2: "", totalshPercent: "", totalAsh: "", rowPercent: "" },
    { id: 5, name: "SUNFLOWER CAKE", freshWeight: "", moist: "", dryWt: "", n2Percent: "", totalN2: "", totalshPercent: "", totalAsh: "", rowPercent: "" },
    { id: 6, name: "O/P - C/M -1 TENI", freshWeight: "", moist: "", dryWt: "", n2Percent: "", totalN2: "", totalshPercent: "", totalAsh: "", rowPercent: "" },
    { id: 7, name: "O/P C/M-2", freshWeight: "", moist: "", dryWt: "", n2Percent: "", totalN2: "", totalshPercent: "", totalAsh: "", rowPercent: "" },
    { id: 8, name: "GYPSUM", freshWeight: "", moist: "", dryWt: "", n2Percent: "", totalN2: "", totalshPercent: "", totalAsh: "", rowPercent: "" },
    { id: 9, name: "UREA", freshWeight: "", moist: "", dryWt: "", n2Percent: "", totalN2: "", totalshPercent: "", totalAsh: "", rowPercent: "" },
    { id: 10, name: "AMMONIUM SULPHATE", freshWeight: "", moist: "", dryWt: "", n2Percent: "", totalN2: "", totalshPercent: "", totalAsh: "", rowPercent: "" },
    { id: 11, name: "SS PHOSPHATE", freshWeight: "", moist: "", dryWt: "", n2Percent: "", totalN2: "", totalshPercent: "", totalAsh: "", rowPercent: "" },
];

const MATERIAL_NAME_MAPPING = {
    "Straw": ["PADDY STRAW", "WHEAT STRAW", "BAGASSE"],
    "Chicken Manure": ["O/P - C/M -1 TENI", "O/P C/M-2"],
    "Wheat Bran": ["WHEAT BRAN"],
    "Sunflower Cake": ["SUNFLOWER CAKE"],
    "Gypsum": ["GYPSUM"],
    "Urea": ["UREA"],
    "Ammonium Sulphate": ["AMMONIUM SULPHATE"],
    "SS Phosphate": ["SS PHOSPHATE"]
};

const getInternalMaterialName = (apiName) => {
    for (const [apiKey, internalNames] of Object.entries(MATERIAL_NAME_MAPPING)) {
        if (apiName.toLowerCase().includes(apiKey.toLowerCase())) {
            return internalNames[0];
        }
    }
    return null;
};

function getCategory(name) {
    return MATERIAL_CATEGORY[name] || "additive";
}

function formatWithCommas(value) {
    if (value === "" || value === null || value === undefined) return "";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    return Math.round(num).toLocaleString("en-IN");
}

function calcWetWeight(dryWt, moist) {
    const dw = parseFloat(dryWt);
    const m = parseFloat(moist);
    if (isNaN(dw) || isNaN(m) || m >= 100) return "";
    if (m === 0) return "";
    return Math.round(dw / (1 - m / 100));
}

function calcTotalN2(dryWt, n2Value) {
    const dw = parseFloat(dryWt);
    const n = parseFloat(n2Value);
    if (isNaN(dw) || isNaN(n)) return "";
    return parseFloat((dw * n).toFixed(2));
}

function calcTotalAsh(dryWt, ashPercent) {
    const dw = parseFloat(dryWt);
    const a = parseFloat(ashPercent);
    if (isNaN(dw) || isNaN(a)) return "";
    return parseFloat((dw * (a / 100)).toFixed(2));
}

function calcRowPercent(category, dryWt, totalStrawDW, totalManureDW, totalBatchDW) {
    const dw = parseFloat(dryWt);
    if (isNaN(dw) || dw === 0) return "";

    let ratio = 0;
    if (category === "straw") {
        if (!totalStrawDW || totalStrawDW === 0) return "";
        ratio = (dw / totalStrawDW) * 100;
        return parseFloat(ratio.toFixed(1));
    } else if (category === "manure") {
        if (!totalManureDW || totalManureDW === 0) return "";
        ratio = (dw / totalManureDW) * 100;
        return Math.round(ratio);
    } else if (category === "gypsum") {
        const base = totalStrawDW + totalManureDW;
        if (!base || base === 0) return "";
        ratio = (dw / base) * 100;
        return parseFloat(ratio.toFixed(2));
    } else {
        if (!totalBatchDW || totalBatchDW === 0) return "";
        ratio = (dw / totalBatchDW) * 100;
        return parseFloat(ratio.toFixed(2));
    }
}

function calcBatchAggregates(materials) {
    let totalBatchDW = 0;
    let sumTotalN2Index = 0;
    let sumRawAshMass = 0;
    let totalStrawDW = 0;
    let totalManureDW = 0;

    materials.forEach((mat) => {
        const dw = parseFloat(mat.dryWt) || 0;
        const n2 = parseFloat(mat.totalN2) || 0;
        const a = parseFloat(mat.totalshPercent) || 0;
        const cat = getCategory(mat.name);

        totalBatchDW += dw;
        if (cat === "straw") totalStrawDW += dw;
        if (cat === "manure") totalManureDW += dw;
        sumTotalN2Index += n2;
        sumRawAshMass += dw * (a / 100);
    });

    const sumTotalAshMass = parseFloat(sumRawAshMass.toFixed(2));
    const totalN2Percent = totalBatchDW > 0 ? (sumTotalN2Index / totalBatchDW) : 0;
    const totalAshPercent = totalBatchDW > 0 ? (sumRawAshMass / totalBatchDW) * 100 : 0;
    const cnRatio = totalN2Percent > 0 ? ((100 - totalAshPercent) / 2) / totalN2Percent : 0;
    const cmPercent = totalStrawDW > 0 ? (totalManureDW / totalStrawDW) * 100 : 0;

    return {
        totalBatchDW: parseFloat(totalBatchDW.toFixed(2)),
        totalStrawDW: parseFloat(totalStrawDW.toFixed(2)),
        totalManureDW: parseFloat(totalManureDW.toFixed(2)),
        sumTotalN2Index: parseFloat(sumTotalN2Index.toFixed(2)),
        sumTotalAshMass,
        totalN2Percent: totalN2Percent.toFixed(2),
        totalAshPercent: totalAshPercent.toFixed(2),
        cnRatio: cnRatio.toFixed(1),
        cmPercent: cmPercent.toFixed(2),
    };
}

function NumberInput({ value, onChange, placeholder = "-", className, min, max, step, disabled }) {
    const inputRef = useRef(null);

    const handleWheel = (e) => {
        e.preventDefault();
        inputRef.current?.blur();
    };

    return (
        <input
            ref={inputRef}
            type="number"
            value={value}
            onChange={onChange}
            onWheel={handleWheel}
            className={className}
            placeholder={placeholder}
            step="any"
            min={min}
            max={max}
            disabled={disabled}
        />
    );
}

export default function AddNewBatchContent({ apiEndpoint = '/batches' }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const toast = useToast();

    const editBatchId = searchParams.get('edit');
    const [isEditMode, setIsEditMode] = useState(false);
    const [loadingBatch, setLoadingBatch] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [batchInfo, setBatchInfo] = useState({
        batchNumber: "",
        startDate: "",
        startTime: "",
    });

    const [materials, setMaterials] = useState(INITIAL_MATERIALS);
    const [completion, setCompletion] = useState({ plannedDate: "", plannedTime: "" });
    const [planComments, setPlanComments] = useState("");
    const [saved, setSaved] = useState(false);

    const agg = calcBatchAggregates(materials);

    useEffect(() => {
        if (editBatchId) {
            setIsEditMode(true);
            fetchBatchDetails(editBatchId);
        }
    }, [editBatchId]);

    const fetchBatchDetails = async (batchId) => {
        try {
            setLoadingBatch(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const response = await fetch(`${apiUrl}/batches/${batchId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch batch details');
            }

            const result = await response.json();

            const batchData = result.data || result;

            populateFormWithBatchData(batchData);

            toast.success("Batch details loaded for editing");

        } catch (error) {
            toast.error("Failed to load batch details for editing");
            console.error("Error fetching batch:", error);
        } finally {
            setLoadingBatch(false);
        }
    };

    const populateFormWithBatchData = (batchData) => {
        const extractDateAndTime = (dateTimeStr) => {
            if (!dateTimeStr) return { date: '', time: '' };
            try {
                const date = new Date(dateTimeStr);
                const formattedDate = date.toISOString().split('T')[0];
                const formattedTime = date.toTimeString().slice(0, 5);
                return { date: formattedDate, time: formattedTime };
            } catch (e) {
                console.error("Error parsing date:", e);
                return { date: '', time: '' };
            }
        };

        const startDateTime = extractDateAndTime(batchData.start_date || batchData.start_time);
        const plannedDateTime = extractDateAndTime(batchData.planned_comp_date || batchData.planned_comp_time);

        setBatchInfo({
            batchNumber: batchData.batch_number || "",
            startDate: startDateTime.date,
            startTime: startDateTime.time,
        });

        setCompletion({
            plannedDate: plannedDateTime.date,
            plannedTime: plannedDateTime.time,
        });

        setPlanComments(batchData.remarks || "");

        setMaterials(prevMaterials =>
            prevMaterials.map(mat => ({
                ...mat,
                freshWeight: "",
                moist: "",
                dryWt: "",
                n2Percent: "",
                totalN2: "",
                totalshPercent: "",
                totalAsh: "",
                rowPercent: ""
            }))
        );

        if (batchData.formulation_entries && batchData.formulation_entries.length > 0) {
            const apiEntriesMap = {};
            batchData.formulation_entries.forEach(entry => {
                apiEntriesMap[entry.name] = entry;
            });

            setTimeout(() => {
                setMaterials(prevMaterials =>
                    prevMaterials.map(mat => {
                        let matchingEntry = null;

                        for (const [apiName, entryData] of Object.entries(apiEntriesMap)) {
                            const possibleMappings = MATERIAL_NAME_MAPPING[apiName] || [];
                            if (possibleMappings.includes(mat.name)) {
                                matchingEntry = entryData;
                                break;
                            }

                            if (mat.name.toLowerCase().includes(apiName.toLowerCase()) ||
                                apiName.toLowerCase().includes(mat.name.toLowerCase())) {
                                matchingEntry = entryData;
                                break;
                            }
                        }

                        if (matchingEntry) {
                            return {
                                ...mat,
                                freshWeight: matchingEntry.wet_weight?.toString() || "",
                                moist: matchingEntry.moisture_percent?.toString() || "",
                                dryWt: matchingEntry.dry_weight?.toString() || "",
                                n2Percent: matchingEntry.nitrogen_percent?.toString() || "",
                                totalN2: matchingEntry.nitrogen_total?.toString() || "",
                                totalshPercent: matchingEntry.ash_percent?.toString() || "",
                                totalAsh: matchingEntry.ash_total?.toString() || "",
                                rowPercent: matchingEntry.total_percent?.toString() || "",
                            };
                        }
                        return mat;
                    })
                );
            }, 100);
        } else {
            toast.info("This batch has no material data. Please add materials.");
        }
    };

    const recomputeRow = useCallback((mat, updatedFields) => {
        const merged = { ...mat, ...updatedFields };
        const totalN2 = calcTotalN2(merged.dryWt, merged.n2Percent);
        const totalAsh = calcTotalAsh(merged.dryWt, merged.totalshPercent);

        let freshWeight = merged.freshWeight;
        if ("dryWt" in updatedFields || "moist" in updatedFields) {
            const ww = calcWetWeight(merged.dryWt, merged.moist);
            freshWeight = ww !== "" ? ww : "";
        }
        return { ...merged, freshWeight, totalN2, totalAsh };
    }, []);

    const handleMaterialChange = useCallback((id, field, value) => {
        setMaterials((prev) => {
            const updated = prev.map((mat) =>
                mat.id !== id ? mat : recomputeRow(mat, { [field]: value })
            );
            const tempAgg = calcBatchAggregates(updated);
            return updated.map((mat) => ({
                ...mat,
                rowPercent: calcRowPercent(
                    getCategory(mat.name),
                    mat.dryWt,
                    tempAgg.totalStrawDW,
                    tempAgg.totalManureDW,
                    tempAgg.totalBatchDW
                ),
            }));
        });
    }, [recomputeRow]);

    const handleBatchInfoChange = (e) => {
        const { name, value } = e.target;
        setBatchInfo((prev) => ({ ...prev, [name]: value }));
    };

    const handleCompletionChange = (e) => {
        const { name, value } = e.target;
        setCompletion((prev) => ({ ...prev, [name]: value }));
    };

    const prepareBatchData = () => {
        const activeMaterials = materials.filter(mat => mat.dryWt && parseFloat(mat.dryWt) > 0);

        const formatDateTime = (date, time) => {
            if (!date || !time) return null;
            return `${date}T${time}:00`;
        };

        const startDateTime = formatDateTime(batchInfo.startDate, batchInfo.startTime);
        const plannedDateTime = formatDateTime(completion.plannedDate, completion.plannedTime);

        const formulationEntries = activeMaterials.map(mat => ({
            name: mat.name,
            wet_weight: mat.freshWeight ? parseFloat(mat.freshWeight) : 0,
            moisture_percent: mat.moist ? parseFloat(mat.moist) : 0,
            dry_weight: mat.dryWt ? parseFloat(mat.dryWt) : 0,
            nitrogen_percent: mat.n2Percent ? parseFloat(mat.n2Percent) : 0,
            nitrogen_total: mat.totalN2 ? parseFloat(mat.totalN2) : 0,
            ash_percent: mat.totalshPercent ? parseFloat(mat.totalshPercent) : 0,
            ash_total: mat.totalAsh ? parseFloat(mat.totalAsh) : 0,
            total_percent: mat.rowPercent ? parseFloat(mat.rowPercent) : 0
        }));

        const payload = {
            batch_number: batchInfo.batchNumber,
            start_date: startDateTime,
            start_time: startDateTime,
            total_dry_wt: agg.totalBatchDW || 0,
            total_n_wt: agg.sumTotalN2Index || 0,
            total_ash_wt: agg.sumTotalAshMass || 0,
            cn_ratio: parseFloat(agg.cnRatio) || 0,
            cm_ratio: parseFloat(agg.cmPercent) || 0,
            n2_ratio: parseFloat(agg.totalN2Percent) || 0,
            ash_ratio: parseFloat(agg.totalAshPercent) || 0,
            planned_comp_date: plannedDateTime,
            planned_comp_time: plannedDateTime,
            remarks: planComments || "",
            formulation_entries: formulationEntries
        };

        return payload;
    };

    const resetForm = () => {
        setBatchInfo({
            batchNumber: "",
            startDate: "",
            startTime: ""
        });

        setMaterials(INITIAL_MATERIALS.map(mat => ({
            ...mat,
            freshWeight: "",
            moist: "",
            dryWt: "",
            n2Percent: "",
            totalN2: "",
            totalshPercent: "",
            totalAsh: "",
            rowPercent: ""
        })));

        setCompletion({
            plannedDate: "",
            plannedTime: ""
        });
        setPlanComments("");
    };

    const handleSaveBatch = async (e) => {
        e.preventDefault();

        if (!batchInfo.batchNumber) {
            toast.error("Please enter a batch number");
            return;
        }
        if (!batchInfo.startDate) {
            toast.warning("Please select a start date");
            return;
        }
        if (!batchInfo.startTime) {
            toast.warning("Please select a start time");
            return;
        }

        const hasMaterial = materials.some((mat) => mat.dryWt && parseFloat(mat.dryWt) > 0);
        if (!hasMaterial) {
            toast.error("Please add at least one material with dry weight");
            return;
        }

        setIsLoading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const method = isEditMode ? 'PUT' : 'POST';
            const endpoint = isEditMode
                ? `${apiUrl}/batches/${editBatchId}`
                : `${apiUrl}${apiEndpoint}`;

            const batchData = prepareBatchData();

            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(batchData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to ${isEditMode ? 'update' : 'save'} batch`);
            }

            if (isEditMode) {
                toast.success("Batch updated successfully!");
                setTimeout(() => {
                    router.push('/batch-details');
                }, 2000);
            } else {
                resetForm();
                setSaved(true);
                toast.success("Batch saved successfully!");
                setTimeout(() => {
                    setSaved(false);
                }, 3000);
            }

        } catch (error) {
            toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'save'} batch.`);
            console.error("Save error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const readOnlyStyle = { background: "#f0f4f8", cursor: "not-allowed" };

    const totalCellStyle = {
        border: "1px solid",
        fontWeight: "bold",
        padding: "2px 3px",
        textAlign: "center",
        fontSize: "0.92em",
    };

    const totalDryWt = agg.totalBatchDW;
    const totalN2Sum = agg.sumTotalN2Index;
    const totalAshSum = agg.sumTotalAshMass;

    const loadingOverlayStyle = {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(255, 255, 255, 0.8)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
    };

    const spinnerStyle = {
        border: "4px solid #f3f3f3",
        borderTop: "4px solid #3498db",
        borderRadius: "50%",
        width: "40px",
        height: "40px",
        animation: "spin 1s linear infinite",
        marginBottom: "1rem",
    };

    return (
        <AppLayout title={isEditMode ? "Edit Batch" : "Add New Batch"}>
            <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

            <div className="add-batch-card">
                {loadingBatch && (
                    <div style={loadingOverlayStyle}>
                        <div style={spinnerStyle}></div>
                        <p>Loading batch details...</p>
                    </div>
                )}

                <form onSubmit={handleSaveBatch}>
                    <h2 className="section-title">
                        {isEditMode ? "Edit Batch Information" : "Batch Information"}
                    </h2>

                    <div className="batch-info-grid">
                        <div className="form-group">
                            <label className="form-label">Batch Number</label>
                            <input
                                type="text"
                                name="batchNumber"
                                value={batchInfo.batchNumber}
                                onChange={handleBatchInfoChange}
                                placeholder="Enter batch number"
                                className="form-input"
                                disabled={isLoading || loadingBatch}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input
                                type="date"
                                name="startDate"
                                value={batchInfo.startDate}
                                onChange={handleBatchInfoChange}
                                className="form-input"
                                disabled={isLoading || loadingBatch}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Start Time</label>
                            <input
                                type="time"
                                name="startTime"
                                value={batchInfo.startTime}
                                onChange={handleBatchInfoChange}
                                className="form-input"
                                disabled={isLoading || loadingBatch}
                            />
                        </div>
                    </div>

                    <h3 className="table-title">Raw Materials</h3>
                    <div className="table-wrapper">
                        <table className="materials-table">
                            <thead>
                                <tr>
                                    <th>S.NO</th>
                                    <th>RAW MATERIALS</th>
                                    <th>FRESH WEIGHT</th>
                                    <th>MOIST %</th>
                                    <th>DRY WT</th>
                                    <th>N2 %</th>
                                    <th>TOTAL N2</th>
                                    <th>ASH %</th>
                                    <th>TOTAL ASH</th>
                                    <th>%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {materials.map((mat) => (
                                    <tr key={mat.id}>
                                        <td>{mat.id}</td>
                                        <td>{mat.name}</td>
                                        <td>
                                            <input
                                                type="text"
                                                value={formatWithCommas(mat.freshWeight)}
                                                readOnly
                                                className="table-input"
                                                placeholder="-"
                                                style={readOnlyStyle}
                                            />
                                        </td>
                                        <td>
                                            <NumberInput
                                                value={mat.moist}
                                                onChange={(e) => handleMaterialChange(mat.id, "moist", e.target.value)}
                                                className="table-input"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                disabled={isLoading || loadingBatch}
                                            />
                                        </td>
                                        <td>
                                            <NumberInput
                                                value={mat.dryWt}
                                                onChange={(e) => handleMaterialChange(mat.id, "dryWt", e.target.value)}
                                                className="table-input"
                                                step="0.01"
                                                min="0"
                                                disabled={isLoading || loadingBatch}
                                            />
                                        </td>
                                        <td>
                                            <NumberInput
                                                value={mat.n2Percent}
                                                onChange={(e) => handleMaterialChange(mat.id, "n2Percent", e.target.value)}
                                                className="table-input"
                                                step="0.01"
                                                min="0"
                                                disabled={isLoading || loadingBatch}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={formatWithCommas(mat.totalN2)}
                                                readOnly
                                                className="table-input"
                                                placeholder="-"
                                                style={readOnlyStyle}
                                            />
                                        </td>
                                        <td>
                                            <NumberInput
                                                value={mat.totalshPercent}
                                                onChange={(e) => handleMaterialChange(mat.id, "totalshPercent", e.target.value)}
                                                className="table-input"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                disabled={isLoading || loadingBatch}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={formatWithCommas(mat.totalAsh)}
                                                readOnly
                                                className="table-input"
                                                placeholder="-"
                                                style={readOnlyStyle}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={mat.rowPercent !== "" ? mat.rowPercent : ""}
                                                readOnly
                                                className="table-input"
                                                placeholder="-"
                                                style={readOnlyStyle}
                                            />
                                        </td>
                                    </tr>
                                ))}
                                <tr>
                                    <td style={{ textAlign: "center", fontWeight: "bolder", color: "black" }} colSpan={2}>TOTAL</td>
                                    <td />
                                    <td />
                                    <td style={totalCellStyle}>
                                        {totalDryWt > 0 ? formatWithCommas(totalDryWt) : ""}
                                    </td>
                                    <td />
                                    <td style={totalCellStyle}>
                                        {totalN2Sum > 0 ? formatWithCommas(totalN2Sum) : ""}
                                    </td>
                                    <td />
                                    <td style={totalCellStyle}>
                                        {totalAshSum > 0 ? formatWithCommas(totalAshSum) : ""}
                                    </td>
                                    <td />
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="totals-container">
                        <div className="total-item">
                            <span className="total-label">C/M % =</span>
                            <input
                                type="text"
                                readOnly
                                value={agg.cmPercent !== "0.00" ? agg.cmPercent : ""}
                                className="total-input"
                                placeholder="0.00"
                                style={readOnlyStyle}
                            />
                        </div>
                        <div className="total-item">
                            <span className="total-label">N2 =</span>
                            <input
                                type="text"
                                readOnly
                                value={agg.totalN2Percent !== "0.00" ? agg.totalN2Percent : ""}
                                className="total-input"
                                placeholder="0.00"
                                style={readOnlyStyle}
                            />
                        </div>
                        <div className="total-item">
                            <span className="total-label">ASH =</span>
                            <input
                                type="text"
                                readOnly
                                value={agg.totalAshPercent !== "0.00" ? agg.totalAshPercent : ""}
                                className="total-input"
                                placeholder="0.00"
                                style={readOnlyStyle}
                            />
                        </div>
                        <br />
                        <div className="total-item">
                            <span className="total-label">C:N =</span>
                            <input
                                type="text"
                                readOnly
                                value={agg.cnRatio !== "0.0" ? agg.cnRatio : ""}
                                className="total-input"
                                placeholder="0.0"
                                style={readOnlyStyle}
                            />
                        </div>
                    </div>

                    <h3 className="section-subtitle">Planned Platform Completion</h3>
                    <div className="completion-grid">
                        <div className="form-group">
                            <label className="form-label">Planned Platform Completion Date</label>
                            <input
                                type="date"
                                name="plannedDate"
                                value={completion.plannedDate}
                                onChange={handleCompletionChange}
                                className="form-input"
                                disabled={isLoading || loadingBatch}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Planned Platform Completion Time</label>
                            <input
                                type="time"
                                name="plannedTime"
                                value={completion.plannedTime}
                                onChange={handleCompletionChange}
                                className="form-input"
                                disabled={isLoading || loadingBatch}
                            />
                        </div>
                    </div>

                    <div className="comments-group">
                        <label className="form-label">Plan Comments</label>
                        <textarea
                            value={planComments}
                            onChange={(e) => setPlanComments(e.target.value)}
                            className="form-textarea"
                            placeholder="Add any comments..."
                            rows="3"
                            disabled={isLoading || loadingBatch}
                        />
                    </div>

                    <div className="action-buttons" style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isLoading || loadingBatch}
                        >
                            {isLoading
                                ? (isEditMode ? "Updating..." : "Saving...")
                                : (isEditMode ? "Update Batch" : "Save Batch")}
                        </button>

                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => router.push('/batch-details')}
                            disabled={isLoading || loadingBatch}
                        >
                            Cancel
                        </button>
                    </div>

                    {saved && !isEditMode && (
                        <div className="success-message" style={{ marginTop: "20px", padding: "10px", background: "#d4edda", color: "#155724", borderRadius: "4px" }}>
                            Batch saved successfully!
                        </div>
                    )}
                </form>
            </div>
        </AppLayout>
    );
}

export default function AddNewBatch() {
    return (
        <ToastProvider>
            <AddNewBatchContent />
        </ToastProvider>
    );
}