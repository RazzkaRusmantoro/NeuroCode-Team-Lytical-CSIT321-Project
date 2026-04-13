'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import PersonalizationStep from './components/PersonalizationStep';
import PricingStep from './components/PricingStep';
import OrganizationStep from './components/OrganizationStep';
import { updateUserPersonalization, updateUserOrganizationName } from '@/actions/setup';
type Stage = 'personalization' | 'pricing' | 'organization';
export default function SetupPage() {
    const [primaryGoal, setPrimaryGoal] = useState('');
    const [role, setRole] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { status } = useSession();
    const userId = params?.userId as string;
    const currentStage = (searchParams.get('stage') || 'personalization') as Stage;
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);
    useEffect(() => {
        if (currentStage === 'personalization') {
            setIsSaving(false);
        }
    }, [currentStage]);
    if (status === 'unauthenticated') {
        return null;
    }
    const updateStage = (newStage: Stage) => {
        router.push(`/setup/${userId}?stage=${newStage}`);
    };
    const handlePersonalizationNext = async () => {
        if (!primaryGoal || !role || isSaving) {
            return;
        }
        setIsSaving(true);
        try {
            const result = await updateUserPersonalization(primaryGoal, role);
            if (result.error) {
                console.error('Failed to save personalization:', result.error);
                setIsSaving(false);
                return;
            }
            updateStage('pricing');
        }
        catch (error) {
            console.error('Error saving personalization:', error);
            setIsSaving(false);
        }
    };
    const handlePricingNext = () => {
        updateStage('organization');
    };
    const handleOrganizationFinish = async () => {
        if (!organizationName.trim()) {
            router.push('/dashboard');
            return;
        }
        try {
            const result = await updateUserOrganizationName(organizationName.trim());
            if (result.error) {
                console.error('Failed to save organization name:', result.error);
            }
        }
        catch (error) {
            console.error('Error saving organization name:', error);
        }
        router.push('/dashboard');
    };
    const getStageClasses = (stage: Stage) => {
        const stageOrder: Stage[] = ['personalization', 'pricing', 'organization'];
        const currentIndex = stageOrder.indexOf(currentStage);
        const stageIndex = stageOrder.indexOf(stage);
        if (stageIndex < currentIndex) {
            return 'transform -translate-x-full opacity-0 absolute w-full';
        }
        else if (stageIndex === currentIndex) {
            return 'transform translate-x-0 opacity-100 relative';
        }
        else {
            return 'transform translate-x-full opacity-0 absolute w-full';
        }
    };
    return (<div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className={`w-full ${currentStage === 'pricing' ? 'max-w-6xl' : 'max-w-5xl'} flex flex-col relative overflow-hidden p-6`}>
        
        <div className={`transition-all duration-500 ease-in-out ${getStageClasses('personalization')}`}>
          <PersonalizationStep primaryGoal={primaryGoal} role={role} onPrimaryGoalChange={setPrimaryGoal} onRoleChange={setRole} onNext={handlePersonalizationNext} isLoading={isSaving}/>
        </div>

        
        <div className={`transition-all duration-500 ease-in-out ${getStageClasses('pricing')}`}>
          <PricingStep selectedPlan={selectedPlan} onPlanSelect={setSelectedPlan} onNext={handlePricingNext}/>
        </div>

        
        <div className={`transition-all duration-500 ease-in-out ${getStageClasses('organization')}`}>
          <OrganizationStep organizationName={organizationName} onOrganizationNameChange={setOrganizationName} onNext={() => { }} onFinish={handleOrganizationFinish}/>
        </div>
      </div>
    </div>);
}
