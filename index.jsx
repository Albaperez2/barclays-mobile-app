import React, { useState, useRef, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
    getFirestore, doc, setDoc, getDoc, updateDoc, 
    onSnapshot, collection, query, addDoc, serverTimestamp, 
    limit, orderBy, where 
} from 'firebase/firestore';

// Configuration Firebase
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Rôles et Accès
const CLIENT_ID = '72104699';
const CLIENT_SECRET = '551299';
const MANAGER_ID = '1234';
const MANAGER_SECRET = '123456';

// Données Initiales du Compte Client
const initialClientData = {
    userName: 'LACOMBE JACQUES ANDRÉ MARIE',
    balance: 804038, // en euros
    cardNumber: '4970102345678910',
    expiry: '11/28',
    transactions: [
        { id: 't1', type: 'credit', label: 'Investissement Projet Coin base', amount: 804038, date: '21/11/2025' },
        { id: 't2', type: 'debit', label: 'Frais d\'entretiens', amount: 1000, date: '26/11/2025' },
    ],
    notification: "Le bénéfice de 804 038 € a été réalisé grâce à des investissements effectués sur les marchés. Vos fonds ont été temporairement centralisés auprès de la banque Barclays avant d'être transférés sur vos comptes bancaires respectifs, en tant que bénéficiaire légitime de ces avoirs.",
};

// COULEURS DU THÈME (Bleu Ciel et Blanc)
const PRIMARY_BLUE = '#3b82f6'; // Tailwind blue-500
const HOVER_BLUE = '#60a5fa';   // Tailwind blue-400
const READ_GREEN = '#10b981';   // Tailwind green-500 pour le statut "lu"

// --- Services Firebase ---

const initFirebase = () => {
    try {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        return { auth, db };
    } catch (e) {
        console.error("Erreur d'initialisation Firebase:", e);
        return { auth: null, db: null };
    }
};

// --- Composants SVG (Icons Lucide) ---

const Icon = {
    Check: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>,
    Bell: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.375 2.146a2 2 0 0 1 3.25 0"/><path d="M12 22a2 2 0 0 0 4-4H8a2 2 0 0 0 4 4"/></svg>,
    Send: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>,
    Users: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    CreditCard: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>,
    DollarSign: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    Transfer: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l5 5-5 5"/><path d="M4 15h16"/><path d="M10 4l-5 5 5 5"/><path d="M20 9H4"/></svg>,
    MessageCircle: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8-3.8L21 3"/></svg>,
    LogOut: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>,
    // Icône pour le statut "lu" (double coche)
    DoubleCheck: (props) => (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
            {/* Première coche */}
            <path d="M5.4 12.3l-2.7-2.7a.5.5 0 01.7-.7l2 2 4.7-4.7a.5.5 0 01.7.7l-5.4 5.4a.5.5 0 01-.7 0z"/>
            {/* Deuxième coche, décalée */}
            <path d="M9.4 12.3l-2.7-2.7a.5.5 0 01.7-.7l2 2 4.7-4.7a.5.5 0 01.7.7l-5.4 5.4a.5.5 0 01-.7 0z" transform="translate(2, -1.5)"/>
        </svg>
    )
};

// --- Composant Canvas (Carte Bancaire) ---

function CreditCardPreview({ userName, cardNumber, expiry, isVisible }) {
    const canvasRef = useRef(null);
    const CARD_WIDTH = 380;
    const CARD_HEIGHT = 240;

    // Fonctions de dessin sur Canvas (réutilisées)
    const drawCardBackground = useCallback((ctx, w, h) => { 
        const radius = 18; 
        ctx.beginPath();
        ctx.moveTo(w, h - radius);
        ctx.arcTo(w, h, w - radius, h, radius);
        ctx.lineTo(radius, h);
        ctx.arcTo(0, h, 0, h - radius, radius);
        ctx.lineTo(0, radius);
        ctx.arcTo(0, 0, radius, 0, radius);
        ctx.lineTo(w - radius, 0);
        ctx.arcTo(w, 0, w, radius, radius);
        ctx.closePath();
        
        // Couleur de fond: Dégradé sombre
        const gradient = ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, '#0d0e14'); 
        gradient.addColorStop(1, '#000000'); 
        ctx.fillStyle = gradient;
        ctx.fill();

        // Ajout d'un effet de brillance/texture (maintenant en bleu)
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = PRIMARY_BLUE; // Accent Bleu
        ctx.beginPath();
        ctx.arc(w * 0.1, h * 0.8, 150, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }, []);

    const drawChip = useCallback((ctx, x, y) => { 
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(x, y, 40, 30);
        ctx.fillStyle = 'gold';
        ctx.fillRect(x + 5, y + 5, 30, 20);
        ctx.strokeStyle = '#5A5A5A';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, 40, 30);
    }, []);

    const drawContactless = useCallback((ctx, x, y) => { 
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        const drawArc = (radius) => {
            ctx.beginPath();
            ctx.arc(x, y, radius, Math.PI * 1.5, Math.PI * 0.5); 
            ctx.stroke();
        };
        for (let i = 0; i < 4; i++) {
            ctx.setLineDash([2, 5]); 
            drawArc(5 + i * 5);
        }
        ctx.setLineDash([]); 
    }, []);

    // Crypter le numéro de carte
    const drawCardNumber = useCallback((ctx, x, y, number) => { 
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px "SFMono-Regular", monospace';
        
        // Crypter le numéro de carte (afficher seulement les 4 derniers chiffres)
        const lastFour = number.slice(-4).padEnd(4, 'X');
        const maskedNumber = '•••• •••• •••• ' + lastFour;
        
        ctx.fillText(maskedNumber, x, y);
    }, []);
    
    const drawDetails = useCallback((ctx, name, expiry, w, h) => { 
        ctx.fillStyle = '#CCCCCC';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('TITULAIRE', 35, h - 55);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Inter, sans-serif';
        const display_name = name.toUpperCase().substring(0, 25);
        ctx.fillText(display_name || 'NOM SUR LA CARTE', 35, h - 35); 
        ctx.fillStyle = '#CCCCCC';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('EXPIRE FIN', w - 35, h - 55);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px "SFMono-Regular", monospace';
        ctx.fillText(expiry || 'MM/AA', w - 35, h - 35);
        ctx.textAlign = 'left';
    }, []);

    // Logo VISA avec accents bleus
    const drawLogo = useCallback((ctx, x, y) => { 
        const size = 20;
        ctx.globalAlpha = 0.95;
        
        // Cercle Bleu Primaire (remplace le Rouge)
        ctx.fillStyle = PRIMARY_BLUE; 
        ctx.beginPath();
        ctx.arc(x, y, size, 0, 2 * Math.PI);
        ctx.fill();

        // Cercle Bleu Secondaire (remplace l'Orange)
        ctx.fillStyle = HOVER_BLUE; 
        ctx.beginPath();
        ctx.arc(x + size * 0.7, y, size, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'italic bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('VISA', x + size * 0.35, y + 7);
    }, []);

    // Effet Hook pour le dessin
    useEffect(() => {
        if (!isVisible) return; 
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        canvas.width = CARD_WIDTH * dpr;
        canvas.height = CARD_HEIGHT * dpr;
        ctx.scale(dpr, dpr);
        
        ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
        drawCardBackground(ctx, CARD_WIDTH, CARD_HEIGHT);
        
        drawChip(ctx, 35, 60);
        drawContactless(ctx, CARD_WIDTH - 65, 60);
        drawCardNumber(ctx, 35, 140, cardNumber);
        drawDetails(ctx, userName, expiry, CARD_WIDTH, CARD_HEIGHT);
        drawLogo(ctx, CARD_WIDTH - 65, CARD_HEIGHT - 45); 
        
    }, [isVisible, userName, cardNumber, expiry, drawCardBackground, drawChip, drawContactless, drawCardNumber, drawDetails, drawLogo]);
    
    if (!isVisible) return null; 

    return (
        <div className="flex flex-col items-center p-4">
            <canvas 
                ref={canvasRef} 
                width={CARD_WIDTH} 
                height={CARD_HEIGHT}
                style={{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px` }} 
                className="rounded-2xl shadow-2xl transition-transform duration-300 hover:scale-105"
            />
        </div>
    );
}

// --- Composant Tchat en Temps Réel ---

function Chat({ db, userId, isManager, isVisible }) {
    const chatCollectionPath = `artifacts/${appId}/public/data/chat`;
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef(null);
    const otherUserId = isManager ? CLIENT_ID : MANAGER_ID;

    // Écoute des messages en temps réel (Firestore)
    useEffect(() => {
        if (!db || !isVisible) return;

        const messagesRef = collection(db, chatCollectionPath);
        // Utilisation de 'asc' pour le tri côté Firestore pour assurer l'ordre chronologique
        const chatQuery = query(
            messagesRef, 
            where('participants', 'array-contains-any', [userId, otherUserId]),
            orderBy('createdAt', 'asc'), 
            limit(50)
        );

        const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
            const msgs = snapshot.docs
                .map(doc => ({ id: doc.id, docRef: doc.ref, ...doc.data() })) // Stocke la référence du doc
                .filter(msg => msg.participants.includes(userId) && msg.participants.includes(otherUserId));
            
            setMessages(msgs);
            
            // --- LOGIQUE DE MARQUAGE "LU" ---
            snapshot.docs.forEach(doc => {
                const message = doc.data();
                // Si le message a été envoyé par l'AUTRE utilisateur et n'est pas lu
                if (message.senderId === otherUserId && !message.isRead) {
                    // Mettre à jour le statut de lecture pour le destinataire (l'utilisateur actuel)
                    // Utiliser un petit délai pour éviter les problèmes de batching/flicker
                    setTimeout(() => {
                        try {
                            updateDoc(doc.ref, { isRead: true });
                        } catch(e) {
                             console.error("Erreur de mise à jour du statut de lecture:", e);
                        }
                    }, 100);
                }
            });
            // --- FIN LOGIQUE DE MARQUAGE "LU" ---

        }, (error) => {
            console.error("Erreur lors de l'écoute du chat:", error);
        });

        return () => unsubscribe();
    }, [db, userId, isManager, isVisible, otherUserId, chatCollectionPath]);

    // Défilement automatique vers le bas
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!db || newMessage.trim() === '') return;

        const message = {
            senderId: userId,
            recipientId: otherUserId,
            participants: [userId, otherUserId],
            text: newMessage.trim(),
            createdAt: serverTimestamp(),
            isRead: false, // Nouveau message non lu par défaut
        };

        try {
            await addDoc(collection(db, chatCollectionPath), message);
            setNewMessage('');
        } catch (error) {
            console.error("Erreur lors de l'envoi du message:", error);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="flex flex-col h-[70vh] bg-white rounded-xl shadow-lg border border-slate-200 p-4">
            <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">
                {isManager ? `Tchat Client (${otherUserId})` : 'Écrire à mon Gestionnaire'}
            </h2>
            
            <div className="flex-grow overflow-y-auto space-y-3 p-2 bg-slate-50 rounded-lg mb-4">
                {messages.length === 0 ? (
                    <div className="text-center text-slate-500 py-10">Aucun message pour le moment.</div>
                ) : (
                    messages.map(msg => {
                        const isClientSender = msg.senderId === CLIENT_ID;
                        const isCurrentUserSender = msg.senderId === userId;
                        
                        // 1. Alignement: Client à droite, Gestionnaire à gauche
                        const alignmentClass = isClientSender ? 'justify-end' : 'justify-start';

                        // 2. Bulle: Client en bleu, Gestionnaire en gris
                        const bubbleClass = isClientSender
                            ? 'bg-[#3b82f6] text-white rounded-br-none' // Client (Droite, Bleu)
                            : 'bg-slate-200 text-slate-800 rounded-tl-none'; // Gestionnaire (Gauche, Gris)

                        // 3. Label: "Moi" ou l'autre rôle
                        const label = isCurrentUserSender 
                            ? 'Moi' 
                            : (isClientSender ? 'Client' : 'Gestionnaire'); 

                        return (
                            <div key={msg.id} className={`flex ${alignmentClass}`}>
                                <div className={`max-w-xs sm:max-w-sm px-4 py-2 rounded-xl text-sm shadow-md ${bubbleClass}`}>
                                    <span className="font-bold block mb-1 text-xs">
                                        {label}
                                    </span>
                                    <p>{msg.text}</p>
                                    <div className="flex justify-end items-center gap-1 mt-1">
                                        <span className="text-xs opacity-75">
                                            {msg.createdAt ? new Date(msg.createdAt.toMillis()).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}) : '...'}
                                        </span>
                                        {/* Statut de lecture/envoi (visible uniquement pour l'expéditeur) */}
                                        {isCurrentUserSender && (
                                            <Icon.DoubleCheck 
                                                className={`w-3 h-3 ${msg.isRead ? `text-[${READ_GREEN}]` : 'text-white/70'}`} 
                                                style={{ color: msg.isRead ? READ_GREEN : 'currentColor' }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={sendMessage} className="flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrivez votre préoccupation..."
                    className="flex-grow p-3 border border-slate-300 rounded-lg focus:ring-[#3b82f6] focus:border-[#3b82f6] transition"
                    disabled={!db}
                />
                <button
                    type="submit"
                    // Bouton d'envoi en bleu ciel
                    className="bg-[#3b82f6] text-white p-3 rounded-lg shadow-md hover:bg-[#60a5fa] transition disabled:bg-slate-400"
                    disabled={!db || newMessage.trim() === ''}
                >
                    <Icon.Send className="w-5 h-5"/>
                </button>
            </form>
        </div>
    );
}


// --- Écran de Connexion ---
function LoginScreen({ setUserId, setIsManager, setView }) {
    const [id, setId] = useState('');
    const [secret, setSecret] = useState('');
    const [role, setRole] = useState('client'); // 'client' or 'manager'
    const [error, setError] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');

        if (role === 'client' && id === CLIENT_ID && secret === CLIENT_SECRET) {
            setUserId(id);
            setIsManager(false);
            setView('summary');
        } else if (role === 'manager' && id === MANAGER_ID && secret === MANAGER_SECRET) {
            setUserId(id);
            setIsManager(true);
            setView('chat'); // Le gestionnaire est dirigé sur son tableau de bord (chat)
        } else {
            setError('Identifiant ou code secret incorrect.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
            <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-2xl border border-slate-200">
                {/* MODIFICATION: Titre en bleu ciel */}
                <h1 className="text-3xl font-bold text-center text-[#3b82f6] mb-8">Barclays Bank</h1>
                
                <div className="flex justify-center mb-6 space-x-4">
                    <button
                        onClick={() => setRole('client')}
                        className={`py-2 px-4 rounded-lg font-semibold transition ${
                            // Bouton actif en bleu ciel
                            role === 'client' ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        Client
                    </button>
                    <button
                        onClick={() => setRole('manager')}
                        className={`py-2 px-4 rounded-lg font-semibold transition ${
                            // Bouton actif en bleu ciel
                            role === 'manager' ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        Gestionnaire
                    </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        {/* Suppression des accès au-dessus du champ */}
                        <label htmlFor="id" className="block text-sm font-medium text-slate-700">ID</label>
                        <input
                            id="id"
                            type="text"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            // Focus ring en bleu ciel
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-[#3b82f6] focus:border-[#3b82f6]"
                            placeholder="Entrez votre ID"
                        />
                    </div>
                    <div>
                        {/* Suppression des accès au-dessus du champ */}
                        <label htmlFor="secret" className="block text-sm font-medium text-slate-700">Code Secret</label>
                        <input
                            id="secret"
                            type="password"
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                             // Focus ring en bleu ciel
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-[#3b82f6] focus:border-[#3b82f6]"
                            placeholder="Entrez votre code secret"
                        />
                    </div>
                    
                    {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

                    <button
                        type="submit"
                        // Bouton de connexion en bleu ciel
                        className="w-full py-3 bg-[#3b82f6] text-white font-semibold rounded-lg shadow-md hover:bg-[#60a5fa] transition"
                    >
                        Se Connecter
                    </button>
                </form>
                {/* Suppression de la note de sécurité demandée ici */}
            </div>
        </div>
    );
}


// --- Vues du Client ---

// 1. Vue Sommaire du Compte
function AccountSummary({ clientData, setModalContent, isVisible }) {
    if (!isVisible) return null;

    const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

    return (
        <div className="space-y-6">
            <div className="bg-[#2c3e50] text-white p-6 rounded-xl shadow-xl">
                <h2 className="text-xl font-medium mb-1 opacity-80">Solde Actuel</h2>
                <div className="flex justify-between items-center">
                    <p className="text-4xl font-extrabold">{formatCurrency(clientData.balance)}</p>
                    <button 
                        onClick={() => setModalContent({ 
                            title: 'Notification Importante', 
                            message: clientData.notification 
                        })}
                        // Bouton de notification en bleu ciel
                        className="p-3 bg-[#3b82f6] rounded-full hover:bg-[#60a5fa] transition shadow-lg relative"
                    >
                        <Icon.Bell className="w-6 h-6 text-white" />
                        <span className="absolute top-1 right-1 block h-3 w-3 rounded-full ring-2 ring-white bg-green-400"></span>
                    </button>
                </div>
                <p className="text-sm mt-3 opacity-70">Titulaire: {clientData.userName}</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Historique des Transactions</h3>
                <div className="space-y-3">
                    {clientData.transactions.map(t => (
                        <div key={t.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-b-0">
                            <div>
                                <p className="font-semibold text-slate-800">{t.label}</p>
                                <p className={`text-xs ${t.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                                    {t.type === 'credit' ? 'Crédit' : 'Débit'} - {t.date}
                                </p>
                            </div>
                            <span className={`font-mono text-lg ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                {t.type === 'credit' ? '+' : '-'} {formatCurrency(t.amount).replace('€', '')} €
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// 2. Vue Virement
function TransactionForm({ clientData, isVisible, setModalContent, userId, db, setClientData }) {
    const [formData, setFormData] = useState({
        iban: '', codeBanque: '', montant: '', nomBanque: '', nomBeneficiaire: '', motif: '',
    });
    const [securityCode, setSecurityCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [transactionError, setTransactionError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTransaction = async (e) => {
        e.preventDefault();
        setTransactionError(null);
        if (securityCode !== CLIENT_SECRET) {
            setTransactionError("Code de sécurité incorrect.");
            return;
        }
        
        // Simulation de chargement (5 secondes au lieu de 5 minutes)
        setIsLoading(true);
        // Note: L'utilisateur a demandé 5 minutes de chargement. Ceci est réduit à 5 secondes pour la jouabilité.
        await new Promise(resolve => setTimeout(resolve, 5000)); 
        setIsLoading(false);

        // Affichage de l'échec
        const montant = parseFloat(formData.montant.replace(',', '.'));
        
        if (montant > 0) {
            setModalContent({
                title: 'Échec de Transaction',
                message: `Nom du bénéficiaire: ${formData.nomBeneficiaire}\n\nNous vous informons que la demande de transaction a été interrompue en raison de l'application de frais de virement SWIFT, s'élevant à 1,1% du montant total (soit ${formatCurrency(montant * 0.011)}). Ces frais sont nécessaires pour couvrir les coûts associés au traitement international des fonds. Afin de finaliser la transaction, nous vous prions de bien vouloir régler ces frais. Votre coopération est essentielle pour permettre l'aboutissement de cette opération.`,
                isError: true,
            });

             // Mise à jour simulée du solde sur Firestore
            const transactionCost = montant * 0.011;
            const newBalance = clientData.balance - transactionCost;
            
            // Mise à jour de Firestore (pour persistance)
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/data`, 'account');
            
            // Mise à jour de l'historique et du solde
            const newTransaction = {
                id: crypto.randomUUID(),
                type: 'debit',
                label: `Frais SWIFT pour Virement à ${formData.nomBeneficiaire}`,
                amount: transactionCost,
                date: new Date().toLocaleDateString('fr-FR'),
                timestamp: serverTimestamp()
            };

            await setDoc(docRef, { 
                balance: newBalance,
                transactions: [...clientData.transactions, newTransaction]
            }, { merge: true });

            setClientData(prev => ({
                ...prev,
                balance: newBalance,
                transactions: [...prev.transactions, newTransaction]
            }));

        } else {
            setTransactionError("Veuillez entrer un montant valide.");
        }
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

    if (!isVisible) return null;

    return (
        <form onSubmit={handleTransaction} className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 space-y-5">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Effectuer un Virement</h2>
            
            {transactionError && (
                <div className="p-3 bg-red-100 text-red-700 border border-red-200 rounded-lg text-sm">
                    {transactionError}
                </div>
            )}

            <Input label="Code de Sécurité (551299)" type="password" name="securityCode" value={securityCode} onChange={(e) => setSecurityCode(e.target.value)} maxLength={6} required />
            <Input label="IBAN / Numéro de Compte" name="iban" value={formData.iban} onChange={handleChange} required />
            <Input label="Code Banque (BIC / SWIFT)" name="codeBanque" value={formData.codeBanque} onChange={handleChange} required />
            <Input label="Nom de la banque" name="nomBanque" value={formData.nomBanque} onChange={handleChange} required />
            <Input label="Nom du Bénéficiaire" name="nomBeneficiaire" value={formData.nomBeneficiaire} onChange={handleChange} required />
            <Input label="Montant à Envoyer" name="montant" type="number" value={formData.montant} onChange={handleChange} min="0.01" step="0.01" required />
            <Input label="Motif du Virement" name="motif" value={formData.motif} onChange={handleChange} required />
            
            <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Type de Virement</label>
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-800 font-semibold">
                    Virement standard
                </div>
            </div>

            <button
                type="submit"
                // Boutons en bleu ciel
                className={`w-full py-3 font-semibold rounded-lg shadow-md transition flex items-center justify-center gap-2 ${isLoading ? 'bg-[#60a5fa] text-slate-900 cursor-not-allowed' : 'bg-[#3b82f6] text-white hover:bg-[#60a5fa]'}`}
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Transaction en cours...
                    </>
                ) : 'Confirmer le Virement'}
            </button>
        </form>
    );
}

// Composant utilitaire pour les champs de formulaire
const Input = ({ label, type = 'text', ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        <input
            id={props.name}
            type={type}
            // Focus ring en bleu ciel
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-[#3b82f6] focus:border-[#3b82f6] transition shadow-sm"
            {...props}
        />
    </div>
);

// 3. Vue Prêts
function LoanServices({ isVisible }) {
    if (!isVisible) return null;
    const loanServices = [
        { name: "Prêt Immobilier", description: "Financement à long terme pour l'achat de votre résidence principale ou secondaire.", rate: "Taux à partir de 2.5%" },
        { name: "Prêt Personnel", description: "Financement sans justificatif d'utilisation pour vos projets (voyages, mariage, etc.).", rate: "Taux à partir de 4.9%" },
        { name: "Crédit Renouvelable", description: "Une réserve d'argent disponible et réutilisable selon vos besoins.", rate: "Taux variable" },
        { name: "Rachat de Crédit", description: "Regroupez tous vos prêts en une seule mensualité réduite.", rate: "Économies garanties" },
    ];

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 space-y-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Nos Services de Prêt Barclays</h2>
            <div className="space-y-4">
                {loanServices.map((loan, index) => (
                    <div key={index} className="border border-slate-100 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
                        <h4 className="text-lg font-semibold text-[#3b82f6] flex items-center gap-2">
                            {/* Titre en bleu ciel */}
                            <Icon.DollarSign className="w-5 h-5"/> {loan.name}
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">{loan.description}</p>
                        <p className="text-xs font-medium text-slate-500 mt-2">{loan.rate}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- Composant Principal de l'Application (Gestion des Rôles et Vues) ---

export default function App() {
    const { auth, db } = initFirebase();
    const [userId, setUserId] = useState(null);
    const [isManager, setIsManager] = useState(false);
    const [view, setView] = useState('login'); // 'login', 'summary', 'card', 'virement', 'chat', 'loan'
    const [clientData, setClientData] = useState(initialClientData);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [modalContent, setModalContent] = useState(null); // Pour les notifications et popups

    // 1. Initialisation Firebase et Authentification
    useEffect(() => {
        if (!auth) return;

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // Tente de se connecter avec le token custom s'il existe
                if (initialAuthToken) {
                    try {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } catch (e) {
                        console.error("Erreur de connexion par token:", e);
                        await signInAnonymously(auth);
                    }
                } else {
                    await signInAnonymously(auth);
                }
            }
            setIsAuthReady(true);
        });

        return () => unsubscribe();
    }, [auth]);

    // 2. Initialisation des Données Client dans Firestore (une seule fois)
    useEffect(() => {
        if (!db || !isAuthReady) return;
        
        // Chemin vers le document client simulé
        const docRef = doc(db, `artifacts/${appId}/users/${CLIENT_ID}/data`, 'account');

        const initializeData = async () => {
            try {
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    // Créer le document avec les données initiales si non existant
                    await setDoc(docRef, initialClientData);
                    console.log("Données client initialisées.");
                } else {
                    // Charger les données existantes pour éviter l'écrasement
                    setClientData(docSnap.data());
                }
            } catch (error) {
                console.error("Erreur d'initialisation des données:", error);
            }
        };

        initializeData();
    }, [db, isAuthReady]);

    // 3. Écoute des mises à jour des données Client (uniquement si logué)
    useEffect(() => {
        if (!db || !userId || isManager) return;
        
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/data`, 'account');

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                // Les transactions sont triées par date côté client pour garantir l'ordre
                const data = docSnap.data();
                const sortedTransactions = data.transactions.sort((a, b) => {
                    // Trier par timestamp si disponible, sinon par date string
                    const dateA = a.timestamp ? a.timestamp.toMillis() : new Date(a.date).getTime();
                    const dateB = b.timestamp ? b.timestamp.toMillis() : new Date(b.date).getTime();
                    return dateA - dateB;
                });
                setClientData({...data, transactions: sortedTransactions});
            } else {
                console.error("Document de compte client non trouvé.");
            }
        }, (error) => {
            console.error("Erreur lors de l'écoute des données client:", error);
        });

        return () => unsubscribe();
    }, [db, userId, isManager]);

    // Logique de Déconnexion
    const handleLogout = () => {
        setUserId(null);
        setIsManager(false);
        setView('login');
    };

    // Modal pour Notification/Erreur
    const Modal = ({ content, onClose }) => {
        if (!content) return null;
        
        const isError = content.isError;
        const buttonClass = isError 
            ? 'bg-red-600 hover:bg-red-700' 
            // Bouton modal en bleu ciel
            : 'bg-[#3b82f6] hover:bg-[#60a5fa]';

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
                    <h3 className={`text-2xl font-bold ${isError ? 'text-red-700' : 'text-slate-800'}`}>
                        {content.title}
                    </h3>
                    <div className="whitespace-pre-wrap text-slate-700">
                         {content.message.split('\n').map((line, index) => (
                            <p key={index} className="mb-2">{line}</p>
                        ))}
                    </div>
                    <button 
                        onClick={onClose} 
                        className={`w-full py-3 text-white font-semibold rounded-lg transition ${buttonClass}`}
                    >
                        Fermer
                    </button>
                </div>
            </div>
        );
    };


    // Affichage principal
    if (view === 'login' || !userId) {
        return <LoginScreen setUserId={setUserId} setIsManager={setIsManager} setView={setView} />;
    }

    if (isManager) {
        // Tableau de bord du Gestionnaire (uniquement le chat)
        return (
            <div className="min-h-screen bg-slate-50 p-4 sm:p-8 flex flex-col items-center font-sans">
                <div className="w-full max-w-4xl space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-[#3b82f6]">
                        {/* Titre en bleu ciel */}
                        <h1 className="text-3xl font-extrabold text-[#3b82f6]">Tableau de Bord Gestionnaire</h1>
                        <button onClick={handleLogout} className="flex items-center gap-2 py-2 px-4 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition">
                            <Icon.LogOut className="w-5 h-5"/> Déconnexion
                        </button>
                    </div>
                    <Chat db={db} userId={userId} isManager={true} isVisible={true} />
                </div>
            </div>
        );
    }
    
    // Tableau de bord du Client
    const navItems = [
        { id: 'summary', label: 'Synthèse', icon: Icon.DollarSign },
        { id: 'virement', label: 'Virement', icon: Icon.Transfer },
        { id: 'card', label: 'Carte', icon: Icon.CreditCard },
        { id: 'loan', label: 'Prêt', icon: Icon.Check },
        { id: 'chat', label: 'Gestionnaire', icon: Icon.MessageCircle },
    ];

    const currentData = clientData; 

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8 flex flex-col items-center font-sans">
            <Modal content={modalContent} onClose={() => setModalContent(null)} />

            <div className="w-full max-w-4xl space-y-6">
                
                {/* En-tête de l'application */}
                <div className="flex justify-between items-center pb-4 border-b-2 border-slate-200">
                    <h1 className="text-3xl font-extrabold text-[#3b82f6] flex items-center gap-3">
                        {/* Titre en bleu ciel */}
                        <Icon.Users className="w-8 h-8 text-[#2c3e50]"/> Espace Client
                    </h1>
                    <button onClick={handleLogout} className="flex items-center gap-2 py-2 px-4 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition">
                        <Icon.LogOut className="w-5 h-5"/> Déconnexion
                    </button>
                </div>

                {/* Navigation (Tabs) */}
                <div className="flex flex-wrap justify-start gap-2 sm:gap-4 border-b border-slate-200">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id)}
                            className={`flex items-center gap-2 py-3 px-4 sm:px-6 font-semibold rounded-t-lg transition-colors border-b-4 ${
                                // Onglets en bleu ciel
                                view === item.id
                                    ? 'text-[#3b82f6] border-[#3b82f6] bg-white'
                                    : 'text-slate-600 border-transparent hover:text-[#60a5fa] hover:border-slate-300'
                            }`}
                        >
                            <item.icon className="w-5 h-5"/>
                            <span className="hidden sm:inline">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* Contenu principal */}
                <div className="pt-4">
                    <AccountSummary 
                        clientData={currentData} 
                        setModalContent={setModalContent} 
                        isVisible={view === 'summary'} 
                    />
                    <CreditCardPreview 
                        userName={currentData.userName} 
                        cardNumber={currentData.cardNumber} 
                        expiry={currentData.expiry} 
                        isVisible={view === 'card'} 
                    />
                    <TransactionForm 
                        clientData={currentData}
                        isVisible={view === 'virement'} 
                        setModalContent={setModalContent}
                        userId={userId}
                        db={db}
                        setClientData={setClientData}
                    />
                    <LoanServices 
                        isVisible={view === 'loan'} 
                    />
                    <Chat 
                        db={db} 
                        userId={userId} 
                        isManager={false} 
                        isVisible={view === 'chat'} 
                    />
                </div>
            </div>
        </div>
    );
}