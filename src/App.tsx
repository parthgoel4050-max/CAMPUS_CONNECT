import { useEffect, useState } from "react";
import "./App.css";
import GalaxyBackground from "./GalaxyBackground";

const CAMPUS_VIDEO =
  "https://res.cloudinary.com/fq2a6und/video/upload/v1789331510/kling_20260914_VIDEO_Start_from_924_0.mp4";

const ADMIN_ID = "admin";

type Year = "Year 1" | "Year 2" | "Year 3" | "Year 4";

type Unit = {
  id: number;
  title: string;
};

type Subject = {
  id: number;
  name: string;
  units: Unit[];
};

type NoteCategory = "original" | "ai";

type NoteMeta = {
  id: string;
  unitKey: string;
  title: string;
  fileName: string;
  originalFileName?: string;
  mimeType: string;
  size: number;
  category: NoteCategory;
  createdAt: number;
  storagePath: string;
};

type Screen =
  | "landing"
  | "role"
  | "years"
  | "admin"
  | "admin-panel"
  | "admin-subject"
  | "admin-unit-notes"
  | "student"
  | "student-subjects"
  | "student-units"
  | "student-unit-notes"
  | "note-viewer";

const YEARS: Year[] = [
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
];

const emptySubjects = (): Record<Year, Subject[]> => ({
  "Year 1": [],
  "Year 2": [],
  "Year 3": [],
  "Year 4": [],
});

async function requestJson<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || "CampusHere API request failed."
    );
  }

  return data;
}

async function getAllNotes(): Promise<NoteMeta[]> {
  const data = await requestJson<{
    success: boolean;
    notes: NoteMeta[];
  }>("/api/notes");

  return data.notes;
}

async function uploadNoteFile({
  file,
  unitKey,
  title,
  category,
}: {
  file: File;
  unitKey: string;
  title: string;
  category: NoteCategory;
}): Promise<NoteMeta> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("unitKey", unitKey);
  formData.append("title", title);
  formData.append("category", category);

  return requestJson<NoteMeta>("/api/notes", {
    method: "POST",
    body: formData,
  });
}

async function deleteNoteFromApi(id: string): Promise<void> {
  await requestJson<{ success: boolean }>(`/api/notes/${id}`, {
    method: "DELETE",
  });
}

async function getNoteDownloadUrl(id: string): Promise<string> {
  const data = await requestJson<{
    success: boolean;
    url: string;
  }>(`/api/notes/${id}/download-url`);

  return data.url;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getUnitKey(
  year: Year,
  subjectId: number,
  unitId: number
) {
  return `${year}__${subjectId}__${unitId}`;
}

function isPdf(note: NoteMeta) {
  return (
    note.mimeType === "application/pdf" ||
    note.fileName.toLowerCase().endsWith(".pdf")
  );
}

function isPowerPoint(note: NoteMeta) {
  const name = note.fileName.toLowerCase();

  return (
    name.endsWith(".ppt") ||
    name.endsWith(".pptx")
  );
}

function App() {
  const [screen, setScreen] =
    useState<Screen>("landing");
  const [darkMode, setDarkMode] =
    useState<boolean>(() => {
      try {
        return (
          localStorage.getItem(
            "campushere_dark_mode"
          ) === "true"
        );
      } catch {
        return false;
      }
    });
  useEffect(() => {
    localStorage.setItem(
      "campushere_dark_mode",
      String(darkMode)
    );
  }, [darkMode]);
  /* =========================================================
     ADMIN
     ========================================================= */

  const [adminId, setAdminId] = useState("");
  const [adminError, setAdminError] = useState("");

  /* =========================================================
     YEAR
     ========================================================= */

  const [selectedYear, setSelectedYear] =
    useState<Year | "">("");

  /* =========================================================
     SUBJECT DATA
     ========================================================= */

  const [subjectsByYear, setSubjectsByYear] =
    useState<Record<Year, Subject[]>>(() => {
      try {
        const savedSubjects =
          localStorage.getItem("campushere_subjects");

        if (savedSubjects) {
          return JSON.parse(savedSubjects);
        }
      } catch {
        console.log("Could not load saved subjects.");
      }

      return emptySubjects();
    });

  /* =========================================================
     ADMIN INPUTS
     ========================================================= */

  const [subjectName, setSubjectName] = useState("");
  const [unitName, setUnitName] = useState("");

  /* =========================================================
     ACTIVE SUBJECT / UNIT
     ========================================================= */

  const [activeSubjectId, setActiveSubjectId] =
    useState<number | null>(null);

  const [activeUnitId, setActiveUnitId] =
    useState<number | null>(null);

  /* =========================================================
     NOTES
     ========================================================= */

  const [notes, setNotes] = useState<NoteMeta[]>([]);

  const [viewerNote, setViewerNote] =
    useState<NoteMeta | null>(null);

  const [viewerUrl, setViewerUrl] =
    useState("");

  const [isUploading, setIsUploading] =
    useState(false);

  /* =========================================================
     MESSAGE
     ========================================================= */

  const [message, setMessage] = useState("");

  /* =========================================================
     SAVE SUBJECTS
     ========================================================= */

  useEffect(() => {
    localStorage.setItem(
      "campushere_subjects",
      JSON.stringify(subjectsByYear)
    );
  }, [subjectsByYear]);

  /* =========================================================
     LOAD NOTES
     ========================================================= */

  useEffect(() => {
    getAllNotes()
      .then((storedNotes) => {
        setNotes(storedNotes);
      })
      .catch(() => {
        console.log("Could not load CampusHere notes.");
      });
  }, []);

  /* =========================================================
     ADMIN LOGIN
     ========================================================= */

  const openAdmin = () => {
    setAdminId("");
    setAdminError("");
    setScreen("admin");
  };

  const verifyAdmin = () => {
    if (adminId.trim() === ADMIN_ID) {
      setAdminError("");
      setSelectedYear("");
      setMessage("");
      setScreen("admin-panel");
      return;
    }

    setAdminError(
      "Invalid CampusHere administrator password."
    );
  };

  /* =========================================================
     STUDENT YEAR
     ========================================================= */

  const selectStudentYear = (year: Year) => {
    setSelectedYear(year);
    setMessage("");
    setScreen("student");
  };

  /* =========================================================
     ADMIN YEAR
     ========================================================= */

  const selectAdminYear = (year: Year) => {
    setSelectedYear(year);
    setSubjectName("");
    setMessage("");
  };

  /* =========================================================
     ADD SUBJECT
     ========================================================= */

  const addSubject = () => {
    if (!selectedYear) {
      setMessage("Select an academic year first.");
      return;
    }

    const name = subjectName.trim();

    if (!name) {
      setMessage("Enter a subject name.");
      return;
    }

    const exists = subjectsByYear[selectedYear].some(
      (subject) =>
        subject.name.toLowerCase() ===
        name.toLowerCase()
    );

    if (exists) {
      setMessage("This subject already exists.");
      return;
    }

    const newSubject: Subject = {
      id: Date.now(),
      name,
      units: [],
    };

    setSubjectsByYear((previous) => ({
      ...previous,
      [selectedYear]: [
        ...previous[selectedYear],
        newSubject,
      ],
    }));

    setSubjectName("");
    setMessage("Subject added successfully.");
  };

  /* =========================================================
     ADMIN SUBJECT
     ========================================================= */

  const openAdminSubject = (subjectId: number) => {
    setActiveSubjectId(subjectId);
    setUnitName("");
    setMessage("");
    setScreen("admin-subject");
  };

  /* =========================================================
     ADD UNIT
     ========================================================= */

  const addUnit = () => {
    if (
      !selectedYear ||
      activeSubjectId === null
    ) {
      return;
    }

    const name = unitName.trim();

    if (!name) {
      setMessage("Enter a unit name.");
      return;
    }

    const subject =
      subjectsByYear[selectedYear].find(
        (item) => item.id === activeSubjectId
      );

    if (!subject) {
      return;
    }

    const exists = subject.units.some(
      (unit) =>
        unit.title.toLowerCase() ===
        name.toLowerCase()
    );

    if (exists) {
      setMessage("This unit already exists.");
      return;
    }

    setSubjectsByYear((previous) => ({
      ...previous,

      [selectedYear]: previous[selectedYear].map(
        (item) => {
          if (item.id !== activeSubjectId) {
            return item;
          }

          return {
            ...item,
            units: [
              ...item.units,
              {
                id: Date.now(),
                title: name,
              },
            ],
          };
        }
      ),
    }));

    setUnitName("");
    setMessage("Unit added successfully.");
  };

  /* =========================================================
     ADMIN UNIT NOTES
     ========================================================= */

  const openAdminUnitNotes = (unitId: number) => {
    setActiveUnitId(unitId);
    setMessage("");
    setScreen("admin-unit-notes");
  };

  /* =========================================================
     STUDENT SUBJECTS
     ========================================================= */

  const openStudentSubjects = () => {
    setMessage("");
    setScreen("student-subjects");
  };

  /* =========================================================
     STUDENT UNIT
     ========================================================= */

  const openStudentSubject = (subjectId: number) => {
    setActiveSubjectId(subjectId);
    setMessage("");
    setScreen("student-units");
  };

  const openStudentUnit = (unitId: number) => {
    setActiveUnitId(unitId);
    setMessage("");
    setScreen("student-unit-notes");
  };

  /* =========================================================
     ACTIVE SUBJECT
     ========================================================= */

  const activeSubject =
    selectedYear &&
      activeSubjectId !== null
      ? subjectsByYear[selectedYear].find(
        (subject) =>
          subject.id === activeSubjectId
      )
      : undefined;

  /* =========================================================
     ACTIVE UNIT
     ========================================================= */

  const activeUnit =
    activeSubject &&
      activeUnitId !== null
      ? activeSubject.units.find(
        (unit) => unit.id === activeUnitId
      )
      : undefined;

  /* =========================================================
     ACTIVE UNIT KEY
     ========================================================= */

  const activeUnitKey =
    selectedYear &&
      activeSubjectId !== null &&
      activeUnitId !== null
      ? getUnitKey(
        selectedYear,
        activeSubjectId,
        activeUnitId
      )
      : "";

  /* =========================================================
     UNIT NOTES
     ========================================================= */

  const activeUnitNotes = notes.filter(
    (note) => note.unitKey === activeUnitKey
  );

  const originalNotes = activeUnitNotes.filter(
    (note) => note.category === "original"
  );

  const aiNotes = activeUnitNotes.filter(
    (note) => note.category === "ai"
  );

  /* =========================================================
     UPLOAD NOTES
     ========================================================= */

  const handleUploadFiles = async (
    event: React.ChangeEvent<HTMLInputElement>,
    category: NoteCategory
  ) => {
    if (
      !selectedYear ||
      activeSubjectId === null ||
      activeUnitId === null
    ) {
      return;
    }

    const files = Array.from(
      event.target.files || []
    );

    if (files.length === 0) {
      return;
    }

    setIsUploading(true);
    setMessage("");

    try {
      const unitKey = getUnitKey(
        selectedYear,
        activeSubjectId,
        activeUnitId
      );

      let uploaded = 0;

      for (const file of files) {
        const lowerName =
          file.name.toLowerCase();

        /* Smart AI Notes = PDF ONLY */
        if (
          category === "ai" &&
          !(
            file.type === "application/pdf" ||
            lowerName.endsWith(".pdf")
          )
        ) {
          continue;
        }

        /* Original Notes = PPT/PPTX/PDF */
        if (
          category === "original" &&
          !(
            lowerName.endsWith(".ppt") ||
            lowerName.endsWith(".pptx") ||
            lowerName.endsWith(".pdf")
          )
        ) {
          continue;
        }

        await uploadNoteFile({
          file,
          unitKey,
          title: file.name.replace(
            /\.[^/.]+$/,
            ""
          ),
          category,
        });

        uploaded++;
      }

      const latestNotes =
        await getAllNotes();

      setNotes(latestNotes);

      if (uploaded > 0) {
        setMessage(
          category === "ai"
            ? `${uploaded} Smart AI note PDF${uploaded > 1 ? "s" : ""
            } uploaded successfully.`
            : `${uploaded} original note file${uploaded > 1 ? "s" : ""
            } uploaded successfully.`
        );
      } else {
        setMessage(
          category === "ai"
            ? "Please select PDF files only."
            : "Please select PPT, PPTX or PDF files."
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while uploading the notes."
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  /* =========================================================
     DELETE NOTE — ADMIN
     ========================================================= */

  const removeNote = async (noteId: string) => {
    try {
      await deleteNoteFromApi(noteId);

      setNotes((previous) =>
        previous.filter(
          (note) => note.id !== noteId
        )
      );

      setMessage("Note removed successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not remove this note."
      );
    }
  };

  /* =========================================================
     OPEN NOTE
     ========================================================= */

  const openNote = async (note: NoteMeta) => {
    try {
      const url = await getNoteDownloadUrl(note.id);

      /* PDF → CampusHere full-screen viewer */
      if (isPdf(note)) {
        setViewerNote(note);
        setViewerUrl(url);
        setScreen("note-viewer");
        return;
      }

      /* PPT/PPTX → open file in a new browser tab */
      if (isPowerPoint(note)) {
        const newWindow = window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );

        if (!newWindow) {
          setMessage(
            "Please allow pop-ups to open the presentation."
          );
        }

        return;
      }

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to open this note."
      );
    }
  };

  /* =========================================================
     BACK FROM VIEWER
     ========================================================= */

  const closeViewer = () => {
    setViewerUrl("");
    setViewerNote(null);
    setScreen("student-unit-notes");
  };

  return (
    <main
      className={`app ${darkMode
        ? "campushere-dark-mode"
        : ""
        }`}
    >
      {/* =====================================================
        LIGHT MODE / CAMPUS VIDEO
        ===================================================== */}

      {!darkMode && (
        <>
          <video
            className="campus-video"
            src={CAMPUS_VIDEO}
            autoPlay
            muted
            loop
            playsInline
          />

          <div className="video-overlay" />

          <div className="vignette" />
        </>
      )}

      {/* =====================================================
        DARK MODE / INTERACTIVE GALAXY
        ===================================================== */}

      {darkMode && (
        <>
          <GalaxyBackground />

          <div className="galaxy-dark-overlay" />

          <div className="galaxy-vignette" />
        </>
      )}

      {/* =====================================================
        DARK MODE BUTTON
        ===================================================== */}

      {screen !== "note-viewer" && (
        <button
          type="button"
          className={`theme-toggle ${darkMode
            ? "theme-toggle-active"
            : ""
            }`}
          onClick={() =>
            setDarkMode(
              (previous) =>
                !previous
            )
          }
          aria-label={
            darkMode
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
        >
          <span className="theme-toggle-icon">
            {darkMode ? "☀" : "☾"}
          </span>

          <span className="theme-toggle-text">
            {darkMode
              ? "LIGHT MODE"
              : "DARK MODE"}
          </span>
        </button>
      )}
      {/* =====================================================
          LANDING
          ===================================================== */}

      {screen === "landing" && (
        <section className="landing-screen">
          <div className="landing-content">
            <p className="eyebrow">
              THE DIGITAL CAMPUS EXPERIENCE
            </p>

            <h1>
              CAMPUS<span>HERE</span>
            </h1>

            <p className="tagline">
              Your Campus. Connected.
            </p>

            <button
              className="enter-button"
              onClick={() =>
                setScreen("role")
              }
            >
              <span>ENTER CAMPUS</span>

              <span className="arrow">
                →
              </span>
            </button>
          </div>

          <div className="bottom-hint">
            <span />
            EXPLORE • LEARN • CONNECT
            <span />
          </div>
        </section>
      )}

      {/* =====================================================
          ROLE
          ===================================================== */}

      {screen === "role" && (
        <section className="role-screen">
          <div className="role-content">
            <button
              className="back-button"
              onClick={() =>
                setScreen("landing")
              }
            >
              ← BACK
            </button>

            <p className="eyebrow">
              WELCOME TO CAMPUSHERE
            </p>

            <h2>
              Who are <span>you?</span>
            </h2>

            <p className="role-subtitle">
              Select your campus identity to continue.
            </p>

            <div className="role-cards">
              <button
                className="role-card"
                onClick={() =>
                  setScreen("years")
                }
              >
                <div className="role-number">
                  01
                </div>

                <div className="role-icon">
                  🎓
                </div>

                <div className="role-info">
                  <span className="role-label">
                    CAMPUS ACCESS
                  </span>

                  <h3>Student</h3>

                  <p>
                    Access subjects, PYQs,
                    mock tests, assignments
                    and academic resources.
                  </p>
                </div>

                <span className="card-arrow">
                  ↗
                </span>
              </button>

              <button
                className="role-card"
                onClick={openAdmin}
              >
                <div className="role-number">
                  02
                </div>

                <div className="role-icon">
                  ◈
                </div>

                <div className="role-info">
                  <span className="role-label">
                    SECURE ACCESS
                  </span>

                  <h3>Admin</h3>

                  <p>
                    Administrative access to
                    manage and maintain
                    CampusHere.
                  </p>
                </div>

                <span className="card-arrow">
                  ↗
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          YEARS
          ===================================================== */}

      {screen === "years" && (
        <section className="year-screen">
          <div className="year-content">
            <button
              className="back-button"
              onClick={() =>
                setScreen("role")
              }
            >
              ← BACK
            </button>

            <p className="eyebrow">
              STUDENT CAMPUS ACCESS
            </p>

            <h2>
              Select your <span>year.</span>
            </h2>

            <p className="year-subtitle">
              Choose your current academic year
              to enter CampusHere.
            </p>

            <div className="year-grid">
              {YEARS.map((year, index) => (
                <button
                  key={year}
                  className="year-card"
                  onClick={() =>
                    selectStudentYear(year)
                  }
                >
                  <span className="year-number">
                    {String(index + 1).padStart(
                      2,
                      "0"
                    )}
                  </span>

                  <div>
                    <span className="year-small">
                      ACADEMIC YEAR
                    </span>

                    <h3>{year}</h3>

                    <p>
                      Enter your student dashboard.
                    </p>
                  </div>

                  <span className="year-arrow">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          ADMIN LOGIN
          ===================================================== */}

      {screen === "admin" && (
        <section className="login-screen">
          <div className="login-card">
            <button
              className="back-button"
              onClick={() =>
                setScreen("role")
              }
            >
              ← BACK
            </button>

            <div className="login-icon">
              ◈
            </div>

            <p className="eyebrow">
              ADMINISTRATOR ACCESS
            </p>

            <h2>
              Verify your <span>identity.</span>
            </h2>

            <p className="login-description">
              Enter your authorized CampusHere
              administrator password to continue.
            </p>

            <label htmlFor="admin-id">
              ADMIN PASSWORD
            </label>

            <input
              id="admin-id"
              type="password"
              value={adminId}
              onChange={(event) => {
                setAdminId(
                  event.target.value
                );
                setAdminError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  verifyAdmin();
                }
              }}
              placeholder="Enter admin password"
              autoComplete="current-password"
            />

            {adminError && (
              <p className="error-message">
                {adminError}
              </p>
            )}

            <button
              className="verify-button"
              onClick={verifyAdmin}
            >
              VERIFY ACCESS
              <span>→</span>
            </button>

            <p className="security-note">
              🔒 Secure CampusHere administrator gateway
            </p>
          </div>
        </section>
      )}

      {/* =====================================================
          ADMIN PANEL
          ===================================================== */}

      {screen === "admin-panel" && (
        <section className="dashboard-screen">
          <div className="dashboard-content">
            <div className="dashboard-top">
              <button
                className="back-button"
                onClick={() =>
                  setScreen("role")
                }
              >
                ← EXIT ADMIN
              </button>

              <div className="dashboard-year">
                ADMIN
              </div>
            </div>

            <p className="eyebrow">
              CAMPUSHERE • ADMIN PANEL
            </p>

            <h2>
              Manage <span>Campus.</span>
            </h2>

            <p className="dashboard-description">
              Select an academic year to manage
              its subjects and units.
            </p>

            <div className="year-grid">
              {YEARS.map((year, index) => (
                <button
                  key={year}
                  className="year-card"
                  onClick={() =>
                    selectAdminYear(year)
                  }
                >
                  <span className="year-number">
                    {String(index + 1).padStart(
                      2,
                      "0"
                    )}
                  </span>

                  <div>
                    <span className="year-small">
                      MANAGE YEAR
                    </span>

                    <h3>{year}</h3>

                    <p>
                      {subjectsByYear[year].length}{" "}
                      subject
                      {subjectsByYear[year].length !==
                        1
                        ? "s"
                        : ""}
                    </p>
                  </div>

                  <span className="year-arrow">
                    →
                  </span>
                </button>
              ))}
            </div>

            {selectedYear && (
              <div className="admin-selected-year">
                <p className="eyebrow">
                  CURRENTLY MANAGING
                </p>

                <h2>{selectedYear}</h2>

                <div className="admin-add-row">
                  <input
                    className="admin-input"
                    type="text"
                    value={subjectName}
                    onChange={(event) =>
                      setSubjectName(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        addSubject();
                      }
                    }}
                    placeholder="Enter subject name"
                  />

                  <button
                    className="verify-button admin-add-button"
                    onClick={addSubject}
                  >
                    ADD SUBJECT
                    <span>+</span>
                  </button>
                </div>

                {message && (
                  <p
                    className={
                      message.includes(
                        "successfully"
                      )
                        ? "security-note"
                        : "error-message"
                    }
                  >
                    {message}
                  </p>
                )}

                <div className="dashboard-grid admin-subject-grid">
                  {subjectsByYear[selectedYear]
                    .length === 0 ? (
                    <div className="dashboard-card empty-card">
                      <div className="dashboard-icon">
                        📚
                      </div>

                      <h3>
                        No Subjects Yet
                      </h3>

                      <p>
                        Add a subject for{" "}
                        {selectedYear}.
                      </p>
                    </div>
                  ) : (
                    subjectsByYear[selectedYear].map(
                      (subject, index) => (
                        <button
                          key={subject.id}
                          className="dashboard-card"
                          onClick={() =>
                            openAdminSubject(
                              subject.id
                            )
                          }
                        >
                          <span className="dashboard-number">
                            {String(
                              index + 1
                            ).padStart(2, "0")}
                          </span>

                          <div className="dashboard-icon">
                            📚
                          </div>

                          <h3>
                            {subject.name}
                          </h3>

                          <p>
                            {subject.units.length}{" "}
                            unit
                            {subject.units.length !==
                              1
                              ? "s"
                              : ""}{" "}
                            added
                          </p>

                          <span className="dashboard-action">
                            MANAGE UNITS →
                          </span>
                        </button>
                      )
                    )
                  )}
                </div>
              </div>
            )}

            <footer className="dashboard-footer">
              <span>CAMPUSHERE</span>
              <span>ADMIN</span>
              <span>
                ACADEMIC MANAGEMENT
              </span>
            </footer>
          </div>
        </section>
      )}

      {/* =====================================================
          ADMIN SUBJECT → UNITS
          ===================================================== */}

      {screen === "admin-subject" &&
        activeSubject &&
        selectedYear && (
          <section className="login-screen">
            <div className="login-card unit-management-card">
              <button
                className="back-button"
                onClick={() =>
                  setScreen("admin-panel")
                }
              >
                ← BACK TO ADMIN
              </button>

              <div className="login-icon">
                📚
              </div>

              <p className="eyebrow">
                {selectedYear} • SUBJECT MANAGEMENT
              </p>

              <h2>
                {activeSubject.name}
              </h2>

              <p className="login-description">
                Add units inside this subject.
                Click a unit to manage its notes.
              </p>

              <label htmlFor="unit-name">
                ADD UNIT
              </label>

              <input
                id="unit-name"
                type="text"
                value={unitName}
                onChange={(event) =>
                  setUnitName(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    addUnit();
                  }
                }}
                placeholder="Example: Unit 1 - Introduction"
              />

              {message && (
                <p
                  className={
                    message.includes(
                      "successfully"
                    )
                      ? "security-note"
                      : "error-message"
                  }
                >
                  {message}
                </p>
              )}

              <button
                className="verify-button"
                onClick={addUnit}
              >
                ADD UNIT
                <span>+</span>
              </button>

              <div className="unit-admin-list">
                <p className="eyebrow">
                  UNITS •{" "}
                  {activeSubject.units.length}
                </p>

                {activeSubject.units.length ===
                  0 ? (
                  <p className="login-description">
                    No units have been added yet.
                  </p>
                ) : (
                  activeSubject.units.map(
                    (unit, index) => {
                      const unitKey =
                        getUnitKey(
                          selectedYear,
                          activeSubject.id,
                          unit.id
                        );

                      const unitNoteCount =
                        notes.filter(
                          (note) =>
                            note.unitKey ===
                            unitKey
                        ).length;

                      return (
                        <button
                          key={unit.id}
                          className="year-card unit-admin-card"
                          onClick={() =>
                            openAdminUnitNotes(
                              unit.id
                            )
                          }
                        >
                          <span className="year-number">
                            {String(
                              index + 1
                            ).padStart(2, "0")}
                          </span>

                          <div>
                            <span className="year-small">
                              UNIT
                            </span>

                            <h3>
                              {unit.title}
                            </h3>

                            <p>
                              {unitNoteCount}{" "}
                              note
                              {unitNoteCount !== 1
                                ? "s"
                                : ""}{" "}
                              uploaded
                            </p>
                          </div>

                          <span className="year-arrow">
                            →
                          </span>
                        </button>
                      );
                    }
                  )
                )}
              </div>
            </div>
          </section>
        )}

      {/* =====================================================
          ADMIN UNIT NOTES
          ===================================================== */}

      {screen === "admin-unit-notes" &&
        activeSubject &&
        activeUnit &&
        selectedYear && (
          <section className="dashboard-screen notes-management-screen">
            <div className="dashboard-content">
              <div className="dashboard-top">
                <button
                  className="back-button"
                  onClick={() =>
                    setScreen("admin-subject")
                  }
                >
                  ← BACK TO UNITS
                </button>

                <div className="dashboard-year">
                  {selectedYear}
                </div>
              </div>

              <p className="eyebrow">
                ADMIN • NOTE MANAGEMENT
              </p>

              <h2>
                {activeUnit.title}
              </h2>

              <p className="dashboard-description">
                Upload the learning material students
                will access from this unit.
              </p>

              {message && (
                <p
                  className={
                    message.includes(
                      "successfully"
                    )
                      ? "security-note"
                      : "error-message"
                  }
                >
                  {message}
                </p>
              )}

              <div className="note-choice-grid">
                {/* ORIGINAL NOTES */}

                <div className="note-choice-card">
                  <div className="note-choice-number">
                    01
                  </div>

                  <div className="note-choice-icon">
                    📚
                  </div>

                  <span className="note-choice-label">
                    ORIGINAL MATERIAL
                  </span>

                  <h3>
                    Original Notes
                  </h3>

                  <p>
                    Upload your actual classroom
                    PPT, PPTX or PDF notes.
                    Students will get the
                    original material exactly
                    as provided.
                  </p>

                  <label className="note-upload-button">
                    {isUploading
                      ? "UPLOADING..."
                      : "UPLOAD ORIGINAL NOTES →"}

                    <input
                      type="file"
                      multiple
                      accept=".ppt,.pptx,.pdf,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      onChange={(event) =>
                        handleUploadFiles(
                          event,
                          "original"
                        )
                      }
                    />
                  </label>

                  <div className="note-count">
                    {originalNotes.length} file
                    {originalNotes.length !== 1
                      ? "s"
                      : ""}{" "}
                    uploaded
                  </div>
                </div>

                {/* AI NOTES */}

                <div className="note-choice-card ai-note-card">
                  <div className="note-choice-number">
                    02
                  </div>

                  <div className="note-choice-icon ai-icon">
                    ✦
                  </div>

                  <span className="note-choice-label">
                    CAMPUSHERE SMART
                  </span>

                  <h3>
                    Smart AI Notes
                  </h3>

                  <p>
                    Upload the polished AI-prepared
                    PDF notes for this unit.
                    Students can open them in a
                    distraction-free full-screen
                    reader.
                  </p>

                  <label className="note-upload-button ai-upload-button">
                    {isUploading
                      ? "UPLOADING..."
                      : "UPLOAD SMART AI PDF →"}

                    <input
                      type="file"
                      multiple
                      accept=".pdf,application/pdf"
                      onChange={(event) =>
                        handleUploadFiles(
                          event,
                          "ai"
                        )
                      }
                    />
                  </label>

                  <div className="note-count">
                    {aiNotes.length} PDF
                    {aiNotes.length !== 1
                      ? "s"
                      : ""}{" "}
                    uploaded
                  </div>
                </div>
              </div>

              {/* ADMIN FILE LIST */}

              <div className="uploaded-notes-section">
                <p className="eyebrow">
                  UPLOADED MATERIAL
                </p>

                {activeUnitNotes.length ===
                  0 ? (
                  <div className="notes-empty-state">
                    <div>◌</div>
                    <h3>
                      Nothing uploaded yet
                    </h3>
                    <p>
                      Choose one of the two
                      upload options above.
                    </p>
                  </div>
                ) : (
                  <div className="uploaded-notes-list">
                    {activeUnitNotes
                      .sort(
                        (a, b) =>
                          b.createdAt -
                          a.createdAt
                      )
                      .map((note) => (
                        <div
                          className="uploaded-note-row"
                          key={note.id}
                        >
                          <div className="uploaded-note-icon">
                            {note.category ===
                              "ai"
                              ? "✦"
                              : "📄"}
                          </div>

                          <div className="uploaded-note-info">
                            <strong>
                              {note.fileName}
                            </strong>

                            <span>
                              {note.category ===
                                "ai"
                                ? "SMART AI PDF"
                                : "ORIGINAL MATERIAL"}{" "}
                              •{" "}
                              {formatFileSize(
                                note.size
                              )}
                            </span>
                          </div>

                          <button
                            className="note-delete-button"
                            onClick={() =>
                              removeNote(
                                note.id
                              )
                            }
                          >
                            REMOVE
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <footer className="dashboard-footer">
                <span>CAMPUSHERE</span>
                <span>{selectedYear}</span>
                <span>
                  {activeSubject.name}
                </span>
              </footer>
            </div>
          </section>
        )}

      {/* =====================================================
          STUDENT DASHBOARD
          ===================================================== */}

      {screen === "student" && (
        <section className="dashboard-screen">
          <div className="dashboard-content">
            <div className="dashboard-top">
              <button
                className="back-button"
                onClick={() =>
                  setScreen("years")
                }
              >
                ← CHANGE YEAR
              </button>

              <div className="dashboard-year">
                {selectedYear}
              </div>
            </div>

            <p className="eyebrow">
              CAMPUSHERE • STUDENT DASHBOARD
            </p>

            <h2>
              Welcome to{" "}
              <span>CampusHere.</span>
            </h2>

            <p className="selected-year">
              {selectedYear}
            </p>

            <p className="dashboard-description">
              Your academic journey, all in one place.
            </p>

            <div className="dashboard-grid">
              <button
                className="dashboard-card"
                onClick={openStudentSubjects}
              >
                <span className="dashboard-number">
                  01
                </span>

                <div className="dashboard-icon">
                  📚
                </div>

                <h3>Subjects</h3>

                <p>
                  Access all your subjects,
                  notes, syllabus and study
                  material.
                </p>

                <span className="dashboard-action">
                  VIEW SUBJECTS →
                </span>
              </button>

              <button
                className="dashboard-card"
                onClick={() =>
                  setMessage(
                    "PYQs module is ready to be connected."
                  )
                }
              >
                <span className="dashboard-number">
                  02
                </span>

                <div className="dashboard-icon">
                  📄
                </div>

                <h3>PYQs</h3>

                <p>
                  Practice Previous Year
                  Questions and prepare
                  for your examinations.
                </p>

                <span className="dashboard-action">
                  EXPLORE PYQs →
                </span>
              </button>

              <button
                className="dashboard-card"
                onClick={() =>
                  setMessage(
                    "Mock Tests module is ready to be connected."
                  )
                }
              >
                <span className="dashboard-number">
                  03
                </span>

                <div className="dashboard-icon">
                  ◉
                </div>

                <h3>Mock Tests</h3>

                <p>
                  Test your preparation with
                  practice tests and improve
                  your performance.
                </p>

                <span className="dashboard-action">
                  START TEST →
                </span>
              </button>

              <button
                className="dashboard-card"
                onClick={() =>
                  setMessage(
                    "Assignments module is ready to be connected."
                  )
                }
              >
                <span className="dashboard-number">
                  04
                </span>

                <div className="dashboard-icon">
                  ✓
                </div>

                <h3>Assignments</h3>

                <p>
                  View assignments, academic
                  tasks and upcoming deadlines.
                </p>

                <span className="dashboard-action">
                  VIEW ASSIGNMENTS →
                </span>
              </button>
            </div>

            {message && (
              <p
                className="security-note"
                style={{
                  textAlign: "center",
                }}
              >
                {message}
              </p>
            )}

            <footer className="dashboard-footer">
              <span>CAMPUSHERE</span>
              <span>{selectedYear}</span>
              <span>ACADEMIC HUB</span>
            </footer>
          </div>
        </section>
      )}

      {/* =====================================================
          STUDENT → SUBJECTS
          ===================================================== */}

      {screen === "student-subjects" &&
        selectedYear && (
          <section className="dashboard-screen">
            <div className="dashboard-content">
              <div className="dashboard-top">
                <button
                  className="back-button"
                  onClick={() =>
                    setScreen("student")
                  }
                >
                  ← BACK TO DASHBOARD
                </button>

                <div className="dashboard-year">
                  {selectedYear}
                </div>
              </div>

              <p className="eyebrow">
                CAMPUSHERE • ACADEMIC HUB
              </p>

              <h2>
                Your <span>Subjects.</span>
              </h2>

              <p className="dashboard-description">
                Subjects available for{" "}
                {selectedYear}.
              </p>

              <div className="dashboard-grid">
                {subjectsByYear[selectedYear]
                  .length === 0 ? (
                  <div className="dashboard-card empty-card">
                    <div className="dashboard-icon">
                      📚
                    </div>

                    <h3>
                      No Subjects Available
                    </h3>

                    <p>
                      Your administrator has
                      not added subjects for
                      this year yet.
                    </p>
                  </div>
                ) : (
                  subjectsByYear[selectedYear].map(
                    (subject, index) => (
                      <button
                        key={subject.id}
                        className="dashboard-card"
                        onClick={() =>
                          openStudentSubject(
                            subject.id
                          )
                        }
                      >
                        <span className="dashboard-number">
                          {String(
                            index + 1
                          ).padStart(2, "0")}
                        </span>

                        <div className="dashboard-icon">
                          📚
                        </div>

                        <h3>
                          {subject.name}
                        </h3>

                        <p>
                          {subject.units.length}{" "}
                          unit
                          {subject.units.length !==
                            1
                            ? "s"
                            : ""}{" "}
                          available.
                        </p>

                        <span className="dashboard-action">
                          OPEN SUBJECT →
                        </span>
                      </button>
                    )
                  )
                )}
              </div>

              <footer className="dashboard-footer">
                <span>CAMPUSHERE</span>
                <span>{selectedYear}</span>
                <span>SUBJECTS</span>
              </footer>
            </div>
          </section>
        )}

      {/* =====================================================
          STUDENT → UNITS
          ===================================================== */}

      {screen === "student-units" &&
        activeSubject &&
        selectedYear && (
          <section className="dashboard-screen">
            <div className="dashboard-content">
              <div className="dashboard-top">
                <button
                  className="back-button"
                  onClick={() =>
                    setScreen(
                      "student-subjects"
                    )
                  }
                >
                  ← BACK TO SUBJECTS
                </button>

                <div className="dashboard-year">
                  {selectedYear}
                </div>
              </div>

              <p className="eyebrow">
                {selectedYear} • SUBJECT
              </p>

              <h2>{activeSubject.name}</h2>

              <p className="dashboard-description">
                Units and learning modules for
                this subject.
              </p>

              <div className="dashboard-grid">
                {activeSubject.units.length ===
                  0 ? (
                  <div className="dashboard-card empty-card">
                    <div className="dashboard-icon">
                      📖
                    </div>

                    <h3>
                      No Units Yet
                    </h3>

                    <p>
                      Units will appear here
                      when your administrator
                      or teacher adds them.
                    </p>
                  </div>
                ) : (
                  activeSubject.units.map(
                    (unit, index) => {
                      const unitKey =
                        getUnitKey(
                          selectedYear,
                          activeSubject.id,
                          unit.id
                        );

                      const noteCount =
                        notes.filter(
                          (note) =>
                            note.unitKey ===
                            unitKey
                        ).length;

                      return (
                        <button
                          key={unit.id}
                          className="dashboard-card"
                          onClick={() =>
                            openStudentUnit(
                              unit.id
                            )
                          }
                        >
                          <span className="dashboard-number">
                            {String(
                              index + 1
                            ).padStart(2, "0")}
                          </span>

                          <div className="dashboard-icon">
                            📖
                          </div>

                          <h3>
                            {unit.title}
                          </h3>

                          <p>
                            {noteCount} learning
                            file
                            {noteCount !== 1
                              ? "s"
                              : ""}{" "}
                            available.
                          </p>

                          <span className="dashboard-action">
                            OPEN UNIT →
                          </span>
                        </button>
                      );
                    }
                  )
                )}
              </div>

              <footer className="dashboard-footer">
                <span>CAMPUSHERE</span>
                <span>{selectedYear}</span>
                <span>
                  {activeSubject.name}
                </span>
              </footer>
            </div>
          </section>
        )}

      {/* =====================================================
          STUDENT → UNIT NOTES
          ===================================================== */}

      {screen === "student-unit-notes" &&
        activeSubject &&
        activeUnit &&
        selectedYear && (
          <section className="dashboard-screen notes-management-screen">
            <div className="dashboard-content">
              <div className="dashboard-top">
                <button
                  className="back-button"
                  onClick={() =>
                    setScreen("student-units")
                  }
                >
                  ← BACK TO UNITS
                </button>

                <div className="dashboard-year">
                  {selectedYear}
                </div>
              </div>

              <p className="eyebrow">
                CAMPUSHERE • UNIT LEARNING
              </p>

              <h2>
                {activeUnit.title}
              </h2>

              <p className="dashboard-description">
                Choose how you want to study this
                unit.
              </p>

              {message && (
                <p className="security-note">
                  {message}
                </p>
              )}

              <div className="note-choice-grid">
                {/* ORIGINAL */}

                <div className="note-choice-card">
                  <div className="note-choice-number">
                    01
                  </div>

                  <div className="note-choice-icon">
                    📚
                  </div>

                  <span className="note-choice-label">
                    CLASSROOM MATERIAL
                  </span>

                  <h3>
                    Original Notes
                  </h3>

                  <p>
                    Open the original PPT,
                    PPTX and PDF material
                    uploaded for this unit.
                  </p>

                  <div className="student-note-count">
                    {originalNotes.length} file
                    {originalNotes.length !== 1
                      ? "s"
                      : ""}{" "}
                    available
                  </div>

                  <button
                    className="note-open-button"
                    disabled={
                      originalNotes.length === 0
                    }
                    onClick={() => {
                      if (
                        originalNotes.length ===
                        1
                      ) {
                        openNote(
                          originalNotes[0]
                        );
                      } else {
                        setMessage(
                          "Choose a file below to open it."
                        );
                      }
                    }}
                  >
                    {originalNotes.length ===
                      1
                      ? "OPEN ORIGINAL NOTES →"
                      : "VIEW ORIGINAL FILES →"}
                  </button>
                </div>

                {/* SMART AI */}

                <div className="note-choice-card ai-note-card">
                  <div className="note-choice-number">
                    02
                  </div>

                  <div className="note-choice-icon ai-icon">
                    ✦
                  </div>

                  <span className="note-choice-label">
                    CAMPUSHERE SMART
                  </span>

                  <h3>
                    Smart AI Notes
                  </h3>

                  <p>
                    Focused, exam-oriented PDF
                    notes prepared for faster
                    revision and understanding.
                  </p>

                  <div className="student-note-count ai-count">
                    {aiNotes.length} PDF
                    {aiNotes.length !== 1
                      ? "s"
                      : ""}{" "}
                    available
                  </div>

                  <button
                    className="note-open-button ai-open-button"
                    disabled={
                      aiNotes.length === 0
                    }
                    onClick={() => {
                      if (
                        aiNotes.length === 1
                      ) {
                        openNote(aiNotes[0]);
                      } else {
                        setMessage(
                          "Choose a Smart AI PDF below to open it."
                        );
                      }
                    }}
                  >
                    {aiNotes.length === 1
                      ? "OPEN SMART AI NOTES ✦"
                      : "VIEW AI NOTES →"}
                  </button>
                </div>
              </div>

              {/* FILE LIST FOR STUDENT */}

              <div className="student-files-section">
                <p className="eyebrow">
                  ORIGINAL MATERIAL
                </p>

                {originalNotes.length ===
                  0 ? (
                  <p className="login-description">
                    No original notes uploaded
                    for this unit yet.
                  </p>
                ) : (
                  <div className="student-note-list">
                    {originalNotes.map(
                      (note, index) => (
                        <div
                          className="student-note-row"
                          key={note.id}
                        >
                          <div className="student-note-index">
                            {String(
                              index + 1
                            ).padStart(2, "0")}
                          </div>

                          <div className="student-note-file-icon">
                            {isPowerPoint(note)
                              ? "▣"
                              : "PDF"}
                          </div>

                          <div className="student-note-info">
                            <strong>
                              {note.fileName}
                            </strong>

                            <span>
                              {formatFileSize(
                                note.size
                              )}
                            </span>
                          </div>

                          <button
                            className="student-file-open"
                            onClick={() =>
                              openNote(note)
                            }
                          >
                            OPEN →
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}

                <p className="eyebrow ai-section-title">
                  SMART AI NOTES
                </p>

                {aiNotes.length === 0 ? (
                  <p className="login-description">
                    Smart AI notes have not
                    been uploaded yet.
                  </p>
                ) : (
                  <div className="student-note-list">
                    {aiNotes.map(
                      (note, index) => (
                        <div
                          className="student-note-row ai-student-row"
                          key={note.id}
                        >
                          <div className="student-note-index">
                            {String(
                              index + 1
                            ).padStart(2, "0")}
                          </div>

                          <div className="student-note-file-icon ai-file-icon">
                            ✦
                          </div>

                          <div className="student-note-info">
                            <strong>
                              {note.fileName}
                            </strong>

                            <span>
                              SMART AI PDF •{" "}
                              {formatFileSize(
                                note.size
                              )}
                            </span>
                          </div>

                          <button
                            className="student-file-open ai-file-open"
                            onClick={() =>
                              openNote(note)
                            }
                          >
                            OPEN PDF ✦
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <footer className="dashboard-footer">
                <span>CAMPUSHERE</span>
                <span>{selectedYear}</span>
                <span>
                  {activeUnit.title}
                </span>
              </footer>
            </div>
          </section>
        )}

      {/* =====================================================
          FULL-SCREEN PDF VIEWER
          ===================================================== */}

      {screen === "note-viewer" &&
        viewerNote &&
        viewerUrl && (
          <section className="note-viewer-screen">
            <div className="note-viewer-topbar">
              <button
                className="viewer-back-button"
                onClick={closeViewer}
              >
                ← BACK
              </button>

              <div className="viewer-title">
                <span className="viewer-badge">
                  {viewerNote.category ===
                    "ai"
                    ? "✦ SMART AI NOTES"
                    : "ORIGINAL NOTES"}
                </span>

                <strong>
                  {viewerNote.fileName}
                </strong>
              </div>

              <a
                className="viewer-download"
                href={viewerUrl}
                download={viewerNote.fileName}
              >
                DOWNLOAD ↓
              </a>
            </div>

            <div className="note-pdf-frame">
              <iframe
                src={viewerUrl}
                title={viewerNote.fileName}
              />
            </div>
          </section>
        )}
    </main>
  );
}

export default App;
