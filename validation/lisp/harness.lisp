;;;; -*- coding: utf-8 -*-
;;;; Banc de référence de la phase 4 : fait tourner le code Lisp D'ORIGINE dans SBCL.
;;;;
;;;; Charge, sans les modifier, les sources CLCE de 2013 (source/clce/) puis
;;;; source/Gerland2013-4.lsp, en remplaçant seulement ce qui n'existe plus :
;;;;  - MidiShare et la séquence *out* : des bouchons qui enregistrent les événements au lieu
;;;;    de les envoyer, avec la même sémantique de curseur que CLCE (midi-move, midi-write-ev,
;;;;    midi-send-im) ;
;;;;  - CAPI et MP (fenêtre et minuteries de LispWorks) : des fonctions vides ;
;;;;  - RANDOM : le même générateur que core/random.js (mulberry32), pour que le Lisp et le
;;;;    JavaScript fassent exactement les mêmes tirages, dans le même ordre, s'ils sont fidèles.
;;;;
;;;; Usage :
;;;;   sbcl --script validation/lisp/harness.lisp <racine du projet> <sortie.json> <cas>...
;;;; Cas :
;;;;   seq:<n>:<graine>:<fin>        (sequence-n °0 °fin) après (init), graine donnée
;;;;   essai:<nom-lisp>:<graine>     (test1), (test4)...
;;;;   parties:<graine>:<nombre>     g-parties et calcul-partie, comme start-sequence
;;;; Sortie : un tableau JSON, un objet par cas : label, événements, erreur éventuelle.

;;; ------------------------------------------------------------------ paquets de LispWorks

(defpackage :capi
  (:use :cl)
  (:export #:define-interface #:push-button #:text-input-pane #:row-layout #:column-layout
           #:apply-in-pane-process #:text-input-pane-text #:display))

(defpackage :mp
  (:use :cl)
  (:export #:make-timer #:schedule-timer-relative-milliseconds #:unschedule-timer))

(defmacro capi:define-interface (&rest r) (declare (ignore r)) nil)
(defun capi:apply-in-pane-process (&rest r) (declare (ignore r)) nil)
(defun capi:display (&rest r) (declare (ignore r)) nil)
(defun capi:text-input-pane-text (&rest r) (declare (ignore r)) nil)
(defun mp:make-timer (&rest r) (declare (ignore r)) nil)
(defun mp:schedule-timer-relative-milliseconds (&rest r) (declare (ignore r)) nil)
(defun mp:unschedule-timer (&rest r) (declare (ignore r)) nil)

;;; RANDOM est remplacé : le paquet du code CLCE masque CL:RANDOM.
;;; REVERSE est masqué aussi : CLCE en fait un nom de variable qu'il déclare SPECIAL (instancie,
;;; dans 1-TimeGenerators.lisp), ce que LispWorks tolérait et que SBCL refuse pour un symbole de
;;; COMMON-LISP. La fonction animots::reverse reste celle de Common Lisp.
(defpackage :animots
  (:use :cl)
  (:shadow #:random #:reverse))

(in-package :animots)

(defun reverse (seq) (cl:reverse seq))

;;; Fonction de LispWorks utilisée par 6Enigma.lisp pour situer les fichiers de la sortie
;;; Finale (inutilisée par Gerland) : un chemin factice suffit.
(defun lisp-image-name () "/animots/image/Contents/MacOS/Animots")

(declaim (sb-ext:muffle-conditions style-warning warning))

;;; ------------------------------------------------------------------ aléa (core/random.js)

(defvar *state* 0 "État de mulberry32, entier de 32 bits.")

(defun u32 (x) (ldb (byte 32 0) x))

(defun next-random ()
  "Tirage suivant de mulberry32, flottant double dans [0, 1). Calcul bit à bit identique à
core/random.js (Math.imul et les décalages y opèrent modulo 2^32)."
  (setf *state* (u32 (+ *state* #x6d2b79f5)))
  (let ((tt *state*))
    (setf tt (u32 (* (logxor tt (ash tt -15)) (logior tt 1))))
    (setf tt (logxor tt (u32 (+ tt (u32 (* (logxor tt (ash tt -7)) (logior tt 61)))))))
    (/ (coerce (logxor tt (ash tt -14)) 'double-float) 4294967296d0)))

(defun random (n &optional state)
  "(random n) : entier dans [0, n) si n est entier, flottant sinon ; erreur si n <= 0."
  (declare (ignore state))
  (unless (and (realp n) (> n 0)) (error "(random ~A): the argument must be a positive number" n))
  (let ((r (next-random)))
    (if (integerp n) (floor (* r n)) (* r n))))

(defun seed (n) (setf *state* (u32 n)))

;;; ------------------------------------------------------------------ bouchons MidiShare

(defvar *nonint-dates* 0 "Nombre de dates non entières demandées au curseur (le framework C attend des entiers).")

(defstruct mscore (events '()) (date 0) name)

(defun new (class &key name) (declare (ignore class)) (make-mscore :name name))

(defun check-date (d)
  (unless (integerp d) (incf *nonint-dates*))
  d)

(defun midi-move (self &key sel date dur pos len refresh)
  "Comme la méthode de 5-Midi-Score.lisp (cas sans sélection) : :date place le curseur, :dur le
déplace, sans argument rend la date courante."
  (declare (ignore sel pos len refresh))
  (when (and date dur) (setq date (+ date dur) dur nil))
  (cond (date (setf (mscore-date self) (check-date date)))
        (dur (setf (mscore-date self) (check-date (+ (mscore-date self) dur)))))
  (values (mscore-date self) 0))

(defun midi-write-ev (self event &key sel date pos dur len step)
  "Écrit l'événement à :date, ou au curseur ; comme CLCE, :date déplace aussi le curseur."
  (declare (ignore sel pos dur len step))
  (let ((d (midi-move self :date date)))
    (push (cons d event) (mscore-events self))))

(defun midi-send-im (self event)
  (push (cons (mscore-date self) event) (mscore-events self)))

(defun midi-clear (self &rest r)
  (declare (ignore r))
  (setf (mscore-events self) '() (mscore-date self) 0))

(defun midi-avail-ev (self) (declare (ignore self)) nil)

(defun note (&key (pitch 60) (dur 0) (vel 80) (chan 0) (port 0)) (list :note pitch dur vel chan port))
(defun key-on (&key (pitch 60) (vel 80) (chan 0) (port 0)) (list :on pitch vel chan port))
(defun key-off (&key (pitch 60) (vel 0) (chan 0) (port 0)) (list :off pitch vel chan port))
(defun pitch-bend (&key (bend 0) (chan 0) (port 0)) (list :bend bend chan port))
(defun ctrl-change (&key (ctrl 0) value val (chan 0) (port 0)) (list :cc ctrl (or value val 0) chan port))
(defun prog-change (&key (pgm 0) (chan 0) (port 0)) (list :pgm pgm chan port))
(defun tempo-change (&key (tempo 500000)) (list :tempo tempo))

;;; ------------------------------------------------------------------ chargement des sources

(defun load-legacy (path)
  "Charge un fichier Lisp de l'époque : ISO-8859-1, fins de ligne CR. Le texte est lu tel quel ;
seules les fins de ligne sont converties, sans quoi un commentaire ; s'étendrait au fichier."
  (let* ((text (with-open-file (s path :external-format :latin-1)
                 (let ((str (make-string (file-length s))))
                   (subseq str 0 (read-sequence str s)))))
         (text (substitute #\Newline #\Return text)))
    (let ((*package* (find-package :animots)))
      (load (make-string-input-stream text)))))

(defvar *root* (second sb-ext:*posix-argv*))

(defun source (rel) (concatenate 'string *root* "/source/" rel))

(let ((*standard-output* (make-broadcast-stream)))
  (dolist (f '("clce/1-TimeGenerators.lisp" "clce/1MidiShare-Tempi.lisp" "clce/2GenerateursPAJ.lisp"
               "clce/6Enigma.lisp" "clce/7Rythmes.lisp" "clce/3Note-Midi-Finale.lisp" "clce/4Processus.lisp"
               "Gerland2013-4.lsp"))
    (load-legacy (source f))))

;;; print-dialog écrit dans la fenêtre CAPI : on garde seulement le nom.
(defvar *label* nil)
(defun print-dialog (seq) (setf *label* seq))

;;; ------------------------------------------------------------------ exécution des cas

(defun reset-shared ()
  "Oublie les flux partagés (listes de propriétés), comme sharedGenerators.reset() en JS."
  (do-symbols (s :animots) (remprop s 'generator) (remprop s 'value-list)))

(defun events-of (score)
  (reverse (mscore-events score)))

(defun json-num (x)
  (if (integerp x) (format nil "~D" x) (format nil "~,6F" (coerce x 'double-float))))

(defun json-str (s)
  (with-output-to-string (o)
    (write-char #\" o)
    (loop for c across (princ-to-string s)
          do (case c (#\" (write-string "\\\"" o)) (#\\ (write-string "\\\\" o)) (t (write-char c o))))
    (write-char #\" o)))

(defun json-event (date ev)
  (format nil "[~A,~A~{,~A~}]" (json-str (string-downcase (symbol-name (first ev)))) (json-num date)
          (mapcar #'json-num (rest ev))))

(defun json-part (out label events err)
  (format out "{\"label\":~A,\"error\":~A,\"events\":[~{~A~^,~}]}"
          (if label (json-str label) "null") (if err (json-str err) "null")
          (mapcar (lambda (e) (json-event (car e) (cdr e))) events)))

(defun run-guarded (thunk)
  "Exécute un calcul, sorties muettes ; rend le message d'erreur éventuel (comme ignore-errors)."
  (let ((*standard-output* (make-broadcast-stream)))
    (handler-case (progn (funcall thunk) nil)
      (error (e) (princ-to-string e)))))

(defun run-case (spec out)
  (let* ((parts (sb-unicode:words spec))
         (fields (loop with start = 0 for i = (position #\: spec :start start)
                       collect (subseq spec start i) while i do (setf start (1+ i)))))
    (declare (ignore parts))
    (let ((kind (first fields)))
      (cond
        ((string= kind "seq")
         (destructuring-bind (n graine fin) (mapcar #'parse-integer (rest fields))
           (seed graine) (reset-shared) (init) (setf *label* nil)
           (let ((err (run-guarded (lambda () (funcall (intern (format nil "SEQUENCE-~D" n) :animots) (g 0) (g fin))))))
             (format out "{\"case\":~A,\"parts\":[" (json-str spec))
             (json-part out *label* (events-of *out*) err)
             (format out "]}"))))
        ((string= kind "essai")
         (let ((name (string-upcase (second fields))) (graine (parse-integer (third fields))))
           (seed graine) (reset-shared) (init) (setf *label* nil)
           (let ((err (run-guarded (lambda () (funcall (intern name :animots))))))
             (format out "{\"case\":~A,\"parts\":[" (json-str spec))
             (json-part out *label* (events-of *out*) err)
             (format out "]}"))))
        ((string= kind "parties")
         (destructuring-bind (graine count) (mapcar #'parse-integer (rest fields))
           (seed graine) (reset-shared)
           (let ((gp (g-parties)))
             (format out "{\"case\":~A,\"parts\":[" (json-str spec))
             (dotimes (k count)
               (setf *label* nil)
               (let ((err (run-guarded (lambda () (calcul-partie gp)))))
                 (when (> k 0) (format out ","))
                 (json-part out *label* (events-of *out*) err)))
             (format out "]}"))))
        (t (error "cas inconnu : ~A" spec))))))

(let ((args (cddr sb-ext:*posix-argv*)))
  (with-open-file (out (first args) :direction :output :if-exists :supersede :external-format :utf-8)
    (format out "{\"nonIntegerDates\":null,\"cases\":[")
    (loop for spec in (rest args) for k from 0
          do (when (> k 0) (format out ","))
             (run-case spec out))
    (format out "]}")
    (terpri out))
  ;; le nombre de dates non entières n'est connu qu'à la fin : on le donne sur la sortie d'erreur
  (format *error-output* "nonIntegerDates=~D~%" *nonint-dates*))
