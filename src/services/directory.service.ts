import type {
  AgentInput,
  CustomerInput,
  DepartmentInput,
  HelpTopicInput,
  OrganizationInput,
  SlaPlanInput,
  TeamInput,
} from "@/lib/schemas";
import type { Agent, Customer, Department, HelpTopic, Organization, SlaPlan, Team } from "@/types";
import { createResourceService } from "./resource.service";

export const customersService = createResourceService<Customer, CustomerInput>("/customers");
export const organizationsService = createResourceService<Organization, OrganizationInput>("/organizations");
export const staffService = createResourceService<Agent, AgentInput>("/staff");
export const departmentsService = createResourceService<Department, DepartmentInput>("/departments");
export const teamsService = createResourceService<Team, TeamInput>("/teams");
export const slaPlansService = createResourceService<SlaPlan, SlaPlanInput>("/sla-plans");
export const helpTopicsService = createResourceService<HelpTopic, HelpTopicInput>("/help-topics");
